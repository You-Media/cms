#!/bin/bash

# Docker Setup Script for CMS Project
# This script automates the Docker setup and deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Function to create .env file from template
setup_env() {
    if [ ! -f .env ]; then
        print_status "Creating .env file from template..."
        cp env.example .env
        print_success ".env file created. Please edit it with your configuration."
    else
        print_warning ".env file already exists. Skipping creation."
    fi
}

# Function to build and run in development mode
dev_setup() {
    print_status "Setting up development environment..."
    
    # Build and start development container
    docker-compose --profile dev up --build -d cms-dev
    
    print_success "Development environment is running!"
    print_status "Access your application at: http://localhost:3000"
    print_status "To view logs: docker-compose --profile dev logs -f cms-dev"
    print_status "To stop: docker-compose --profile dev down"
}

# Function to build and run in production mode
prod_setup() {
    print_status "Setting up production environment..."
    
    # Build and start production container
    docker-compose up --build -d cms
    
    print_success "Production environment is running!"
    print_status "Access your application at: http://localhost:3000"
    print_status "To view logs: docker-compose logs -f cms"
    print_status "To stop: docker-compose down"
}

# Serve local ./out via Apache without building inside Docker
static_mount() {
    if [ ! -d out ] || [ ! -f out/index.html ]; then
        print_error "Missing ./out. Run 'npm run build' first to generate static export."
        exit 1
    fi
    print_status "Starting Apache to serve ./out on http://localhost:3000 ..."
    docker-compose --profile static-mount up -d cms-static-mount
    print_success "Static mount running at: http://localhost:3000"
    print_status "To view logs: docker-compose --profile static-mount logs -f cms-static-mount"
}

static_down() {
    print_status "Stopping static-mount service..."
    docker-compose --profile static-mount down
    print_success "Stopped."
}

# Function to clean up Docker resources
cleanup() {
    print_status "Cleaning up Docker resources..."
    
    # Stop and remove containers
    docker-compose down --remove-orphans
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    print_success "Cleanup completed!"
}

# Function to show logs
show_logs() {
    if [ "$1" = "dev" ]; then
        docker-compose --profile dev logs -f cms-dev
    elif [ "$1" = "static" ]; then
        docker-compose --profile static-mount logs -f cms-static-mount
    else
        docker-compose logs -f cms
    fi
}

# Function to show status
show_status() {
    print_status "Docker containers status:"
    docker-compose ps
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev            - Start development environment"
    echo "  prod           - Start production environment (Node server)"
    echo "  static         - Build and serve static export with Apache on port 3000"
    echo "  static-mount   - Serve existing ./out with Apache on port 3000 (no Docker build)"
    echo "  static-down    - Stop static-mount"
    echo "  stop           - Stop all containers"
    echo "  logs [dev|static] - Show logs (dev or static)"
    echo "  status         - Show container status"
    echo "  cleanup        - Clean up Docker resources"
    echo "  setup          - Initial setup (check Docker, create .env)"
    echo "  help           - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 static-mount    - Serve local out/ at http://localhost:3000"
    echo "  $0 static          - Build inside Docker, then serve"
}

# Main script logic
case "${1:-dev}" in
    "setup")
        check_docker
        setup_env
        print_success "Setup completed! Run '$0' to start development environment."
        ;;
    "dev")
        check_docker
        setup_env
        dev_setup
        ;;
    "prod")
        check_docker
        setup_env
        prod_setup
        ;;
    "static")
        check_docker
        setup_env
        print_status "Building static image and starting Apache..."
        docker-compose up --build -d cms
        print_success "Static site is running at: http://localhost:3000"
        print_status "To view logs: docker-compose logs -f cms"
        ;;
    "static-mount")
        check_docker
        static_mount
        ;;
    "static-down")
        check_docker
        static_down
        ;;
    "stop")
        print_status "Stopping containers..."
        docker-compose down
        print_success "Containers stopped!"
        ;;
    "logs")
        show_logs $2
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|*)
        show_help
        ;;
esac 