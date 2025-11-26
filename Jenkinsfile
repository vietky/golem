pipeline {
    agent any
    
    environment {
        ANSIBLE_HOST_KEY_CHECKING = 'False'
        ANSIBLE_FORCE_COLOR = 'true'
    }
    
    parameters {
        string(name: 'GIT_BRANCH', defaultValue: 'main', description: 'Git branch to deploy')
        choice(name: 'ENVIRONMENT', choices: ['production', 'staging'], description: 'Target environment')
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo "Checking out branch: ${params.GIT_BRANCH}"
                checkout scm
            }
        }
        
        stage('Verify Ansible') {
            steps {
                script {
                    sh '''
                        echo "Checking Ansible installation..."
                        ansible --version
                        echo "Checking playbook syntax..."
                        ansible-playbook --syntax-check ansible/deploy-playbook.yml
                    '''
                }
            }
        }
        
        stage('Deploy with Ansible') {
            steps {
                script {
                    echo "Deploying to ${params.ENVIRONMENT}..."
                    
                    // Run Ansible playbook
                    sh """
                        ansible-playbook \
                            -i ansible/inventory.yml \
                            ansible/deploy-playbook.yml \
                            -e "git_branch=${params.GIT_BRANCH}" \
                            -v
                    """
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    echo "Verifying deployment..."
                    
                    // Give the application time to start
                    sleep 10
                    
                    // Check if the application is responding
                    sh '''
                        # Get the server IP from inventory
                        SERVER_IP=$(grep ansible_host ansible/inventory.yml | awk '{print $2}')
                        
                        # Check if application is accessible
                        echo "Testing application at http://${SERVER_IP}:8081/"
                        
                        if curl -f -s -o /dev/null -w "%{http_code}" "http://${SERVER_IP}:8081/" | grep -q "200"; then
                            echo "✓ Application is responding correctly"
                        else
                            echo "✗ Application health check failed"
                            exit 1
                        fi
                    '''
                }
            }
        }
    }
    
    post {
        success {
            echo "✓ Deployment completed successfully!"
            // You can add notifications here (Slack, email, etc.)
        }
        failure {
            echo "✗ Deployment failed!"
            // You can add failure notifications here
        }
        always {
            // Clean up workspace
            cleanWs()
        }
    }
}
