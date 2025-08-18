pipeline {
  agent any
  environment {
    MAVEN_HOME = tool 'maven-3.9'
    PATH = "${MAVEN_HOME}/bin:${PATH}"
    SONAR_HOST_URL = 'http://sonarqube:9000'
    SONAR_SCANNER_HOME = tool 'sonar-scanner'
    SONAR_TOKEN = credentials('sonar-token')
  }
  stages {
    stage('Checkout'){ steps{ checkout scm } }

    stage('Backend: Build + Sonar'){
      steps{
        sh """
          mvn -B -DskipTests clean verify sonar:sonar \
            -Dsonar.host.url=${SONAR_HOST_URL} \
            -Dsonar.login=${SONAR_TOKEN} \
            -Dsonar.projectKey=backend \
            -Dsonar.projectName=Backend
        """
      }
      post { always { junit allowEmptyResults: true, testResults: '**/target/surefire-reports/*.xml' } }
    }

    stage('Frontend: Sonar'){
      steps{
        dir('frontend/frontend-app'){
          sh 'npm ci || true'
          sh 'npm run build --if-present || true'
          sh """
            ${SONAR_SCANNER_HOME}/bin/sonar-scanner \
              -Dsonar.host.url=${SONAR_HOST_URL} \
              -Dsonar.login=${SONAR_TOKEN} \
              -Dsonar.projectKey=frontend-app \
              -Dsonar.projectName="Frontend App"
          """
        }
      }
    }
  }
}
