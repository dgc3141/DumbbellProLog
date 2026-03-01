
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

# Build using cargo-lambda Docker image for AWS Lambda GLIBC compatibility
echo "Building with cargo-lambda via Docker..."
docker run --rm -v $(pwd)/..:/code -w /code/backend ghcr.io/cargo-lambda/cargo-lambda cargo lambda build --release --x86-64

# Ensure dist directory exists
mkdir -p dist

# Copy binary to dist (cargo-lambda puts it in target/lambda/<binary-name>/bootstrap)
cp target/lambda/backend/bootstrap dist/bootstrap

cd ..

# 3. Infrastructure
echo "☁️  Ready for CDK Deploy!"
echo "Run: cd infra && npx cdk deploy"
