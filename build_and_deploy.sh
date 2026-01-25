
#!/bin/bash
set -e

echo "💪 Building Dumbbell Pro Log..."

# 1. Frontend Build
echo "📦 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Backend Build
echo "🦀 Building Backend (Rust)..."
cd backend

# Build standard release (Assumes Linux environment for Lambda compatibility)
echo "Building for release..."
cargo build --release

# Ensure dist directory exists
mkdir -p dist

# Copy binary as 'bootstrap' (Required for provided.al2 runtime)
cp target/release/backend dist/bootstrap

cd ..

# 3. Infrastructure
echo "☁️  Ready for CDK Deploy!"
echo "Run: cd infra && npx cdk deploy"
