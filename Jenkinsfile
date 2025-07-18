pipeline {
    agent {
        label 'windows-arjun'
    }

    environment {
        DOCKERHUB_USERNAME = credentials('DOCKERHUB_USERNAME_ARJUN')
        DOCKERHUB_TOKEN = credentials('DOCKERHUB_TOKEN_ARJUN')
        COMMIT_ID = "${env.GIT_COMMIT.take(6)}"
        APP_NAME = 'node-app-only-trivy'
        APP_ENV = 'dev'
        ENABLE_TRIVY = 'true'
        ENABLE_SONARQUBE = 'false'
        ENABLE_ZAP = 'false'
        SONAR_TOKEN = credentials('SONAR_TOKEN_ARJUN')
        BUILD_TIME = "${new Date().format('yyyy-MM-dd\'T\'HH:mm:ss')}"
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Set Commit ID') {
            steps {
                script {
                    env.COMMIT_ID = env.GIT_COMMIT.take(6)
                    echo "COMMIT_ID set to: ${env.COMMIT_ID}"
                }
            }
        }

        stage('SonarQube Scan') {
            when {
                expression {return env.ENABLE_SONARQUBE}
            }
            steps {
                withSonarQubeEnv('SonarQube') {
                    script{
                    def sonarResult = bat(script: '"C:\\Users\\arjun.nair\\Downloads\\sonar-scanner-cli-7.1.0.4889-windows-x64\\sonar-scanner-7.1.0.4889-windows-x64\\bin\\sonar-scanner.bat" -Dsonar.projectKey=%APP_NAME% -Dsonar.sources=. -Dsonar.host.url=http://127.0.0.1:9001 -Dsonar.login=%SONAR_TOKEN%', returnStatus: true)
                    env.SONAR_GATE = (sonarResult == 0) ? 'PASS':'FAIL'
                    env.SONAR_LAST_RUN = new Date().format("yyyy-MM-dd'T'HH:mm:ss")
                    }
                }
            }
        }

        stage('Set Build Info') {
            steps {
                dir('src/backend') {
                    script {
                    writeFile file: '.env', text: """
                    APP_NAME = ${env.APP_NAME}
                    NODE_ENV = ${env.APP_ENV}
                    COMMIT_ID = ${env.COMMIT_ID}
                    BUILD_TIME= ${env.BUILD_TIME}
                    SONAR_GATE = ${env.SONAR_GATE}
                    SONAR_LAST_RUN = ${env.SONAR_LAST_RUN}
                    """
                    }
                }
            }
        }

        stage('Login to Docker Hub') {
            steps {
                bat '''
                    echo %DOCKERHUB_TOKEN% | docker login --username %DOCKERHUB_USERNAME% --password-stdin
                '''
            }
        }

        stage('Trivy Filesystem Scan') {
            when {
                expression {return env.ENABLE_TRIVY}
            }
            steps {
                script {
                    bat '''
                        echo Running Trivy Filesystem Scan...
                        trivy fs .
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    def app_name = env.APP_NAME
                    bat """
                        docker build -t arjun150800/${app_name}:${env.COMMIT_ID} .
                    """
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    def app_name = env.APP_NAME
                    bat """
                        docker push arjun150800/${app_name}:${env.COMMIT_ID}
                    """
                }
            }
        }

        stage('Trivy Image Scan') {
            when {
                expression {return env.ENABLE_TRIVY}
            }
            steps {
                script {
                    def trivyStatus = bat(script: 'trivy image arjun150800/%APP_NAME%:%COMMIT_ID%', returnStatus: true)
                }
            }
        }
        
        stage('Deploy with Helm') {
            steps {
                script {
                    def commitId = env.COMMIT_ID
                    def app_name = env.APP_NAME
                    def app_env = env.APP_ENV
                    bat """
                        wsl helm upgrade --install ${app_name} ./charts/${app_name} -n ${app_env} --create-namespace --set image.tag=${commitId}
                    """
                }
            }
        }

        stage('Post-deployment Health Check') {
            steps {
                script {
                def app_name = env.APP_NAME
                def app_env = env.APP_ENV
                env.FULL_APP_NAME = "svc/${env.APP_NAME}"

                powershell '''
                Write-Host "Starting port forward..." 
                $portForward = Start-Process -FilePath "wsl" `
                    -ArgumentList "kubectl", "port-forward", ${env:FULL_APP_NAME}, "-n", ${env:APP_ENV}, "8080:5000" `
                    -NoNewWindow -PassThru
    
                Start-Sleep -Seconds 10
    
                Write-Host "Check /health endpoint..."
                try {
                    $response = Invoke-WebRequest -Uri http://localhost:8080/health -UseBasicParsing
                    Write-Host "Health check successful: $($response.Content)"
                } catch {
                    Write-Host "Health check failed: $($_.Exception.Message)"
                    Stop-Process -Id $portForward.Id -Force
                    exit 1
                }

                if (Get-Process -Id $portForward.Id -ErrorAction SilentlyContinue) {
                    Write-Host "Stopping port-forward..."
                    Stop-Process -Id $portForward.Id -Force
                } else {
                    Write-Host "Port-forward process already exited."
                }
                '''
                }
            }
    }
        stage('ZAP DAST Scan') {
            when {
                expression {return env.ENABLE_ZAP}
            }
            steps {
                script {
                def app_name = env.APP_NAME
                def app_env = env.APP_ENV
                def target = 'http://host.docker.internal:8080'
                def reportPath = 'scan-report.html'

                
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE'){   
                powershell '''
                Write-Host "Starting port forward..." 
                $portForward = Start-Process -FilePath "wsl" `
                    -ArgumentList "kubectl", "port-forward", ${env:FULL_APP_NAME}, "-n", ${env:APP_ENV}, "8080:5000" `
                    -NoNewWindow -PassThru
    
                Start-Sleep -Seconds 10
    
                Write-Host "Running OWASP ZAP DAST scan..."
                try {
                    docker run --rm -v "$($PWD.Path):/zap/wrk/:rw" zaproxy/zap-stable zap-baseline.py -t http://host.docker.internal:8080 -r scan-report.html
                } catch {
                    Write-Host "ZAP scan encountered a non-critical error: $($_.Exception.Message)"
                    # Do not exit 1 here - continue the build
                }
                if (Get-Process -Id $portForward.Id -ErrorAction SilentlyContinue) {
                    Write-Host "Stopping port-forward..."
                    Stop-Process -Id $portForward.Id -Force
                } else {
                    Write-Host "Port-forward process already exited."
                }
                '''
                }
                }
            }
    }
                
        stage('Open ZAP Report') {
        steps {
        powershell '''
            $report = "$env:WORKSPACE\\scan-report.html"
            if (Test-Path $report) {
            Write-Host "Opening ZAP Scan Report..."
            Start-Process $report
            } else {
            Write-Host "ZAP Report not found: $report"
            }
        '''
        }
        }
    }

    post {
        always {
            echo 'Jenkins Pipeline Complete'
        }
    }
}