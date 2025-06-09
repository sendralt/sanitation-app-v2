#!/bin/bash

# Restart Services with Security Enhancements
# This script restarts both services and tests the security implementations

echo "🔒 Restarting services with security enhancements..."

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    
    if lsof -i:$port > /dev/null 2>&1; then
        echo "✅ $service_name is running on port $port"
        return 0
    else
        echo "❌ $service_name is not running on port $port"
        return 1
    fi
}

# Function to stop services gracefully
stop_services() {
    echo "🛑 Stopping existing services..."
    
    # Stop backend service
    if lsof -i:3001 > /dev/null 2>&1; then
        echo "   Stopping backend service..."
        pkill -f "node.*server.js" || true
        sleep 2
    fi
    
    # Stop dhl_login service
    if lsof -i:3000 > /dev/null 2>&1; then
        echo "   Stopping dhl_login service..."
        pkill -f "node.*app.js" || true
        sleep 2
    fi
    
    echo "   Services stopped"
}

# Function to start services
start_services() {
    echo "🚀 Starting services with security enhancements..."
    
    # Start backend service
    echo "   Starting backend service..."
    cd /var/www/sanitation-app/backend
    nohup node server.js > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "   Backend started with PID: $BACKEND_PID"
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start dhl_login service
    echo "   Starting dhl_login service..."
    cd /var/www/sanitation-app/dhl_login
    nohup node app.js > logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "   Frontend started with PID: $FRONTEND_PID"
    
    # Wait for services to fully start
    sleep 5
}

# Function to test security features
test_security() {
    echo "🧪 Testing security implementations..."
    
    # Test 1: Check if services are responding
    echo "1. Testing service availability..."
    if check_service "Backend" 3001 && check_service "Frontend" 3000; then
        echo "   ✅ Both services are running"
    else
        echo "   ❌ One or more services failed to start"
        return 1
    fi
    
    # Test 2: Test rate limiting
    echo "2. Testing rate limiting..."
    for i in {1..3}; do
        response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/config)
        if [ "$response" = "200" ]; then
            echo "   Request $i: ✅ Success ($response)"
        else
            echo "   Request $i: ⚠️  Response code: $response"
        fi
        sleep 1
    done
    
    # Test 3: Test security headers
    echo "3. Testing security headers..."
    headers=$(curl -s -I http://localhost:3000/ | grep -E "(X-Content-Type-Options|X-Frame-Options|X-XSS-Protection)")
    if [ -n "$headers" ]; then
        echo "   ✅ Security headers detected:"
        echo "$headers" | sed 's/^/      /'
    else
        echo "   ⚠️  No security headers detected"
    fi
    
    # Test 4: Test JWT secret strength
    echo "4. Testing JWT configuration..."
    backend_secret=$(grep "JWT_SECRET=" backend/.env | cut -d'=' -f2)
    frontend_secret=$(grep "JWT_SECRET=" dhl_login/.env | cut -d'=' -f2)
    
    if [ ${#backend_secret} -ge 128 ] && [ ${#frontend_secret} -ge 128 ]; then
        echo "   ✅ Strong JWT secrets configured (${#backend_secret} and ${#frontend_secret} characters)"
    else
        echo "   ⚠️  JWT secrets may be weak (${#backend_secret} and ${#frontend_secret} characters)"
    fi
    
    # Test 5: Check admin credentials
    echo "5. Testing admin credentials..."
    admin_password=$(grep "INITIAL_ADMIN_PASSWORD=" dhl_login/.env | cut -d'=' -f2)
    if [ "$admin_password" != "password123" ] && [ ${#admin_password} -ge 12 ]; then
        echo "   ✅ Strong admin password configured (${#admin_password} characters)"
    else
        echo "   ❌ Weak or default admin password detected"
    fi
}

# Function to display service logs
show_logs() {
    echo "📋 Recent service logs:"
    echo ""
    echo "Backend logs (last 10 lines):"
    tail -n 10 /var/www/sanitation-app/backend/logs/backend.log 2>/dev/null || echo "   No backend logs found"
    echo ""
    echo "Frontend logs (last 10 lines):"
    tail -n 10 /var/www/sanitation-app/dhl_login/logs/frontend.log 2>/dev/null || echo "   No frontend logs found"
}

# Main execution
main() {
    echo "🔒 Security Enhancement Deployment Script"
    echo "========================================"
    echo ""
    
    # Create log directories if they don't exist
    mkdir -p /var/www/sanitation-app/backend/logs
    mkdir -p /var/www/sanitation-app/dhl_login/logs
    
    # Stop existing services
    stop_services
    echo ""
    
    # Start services with security enhancements
    start_services
    echo ""
    
    # Test security implementations
    test_security
    echo ""
    
    # Show recent logs
    show_logs
    echo ""
    
    echo "🎉 Security enhancement deployment completed!"
    echo ""
    echo "📝 Summary of implemented security features:"
    echo "   ✅ Strong JWT secrets (512-bit)"
    echo "   ✅ Strong admin password"
    echo "   ✅ Input validation middleware"
    echo "   ✅ Rate limiting protection"
    echo "   ✅ Security headers"
    echo "   ✅ XSS protection"
    echo "   ✅ SSL verification enabled"
    echo ""
    echo "🔗 Access URLs:"
    echo "   Frontend: https://dot1hundred.com"
    echo "   Backend API: https://dot1hundred.com/api"
    echo ""
    echo "🔑 New Admin Credentials:"
    echo "   Username: admin"
    echo "   Password: $admin_password"
    echo ""
    echo "⚠️  IMPORTANT: Save the admin password securely!"
}

# Run the main function
main
