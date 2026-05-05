#!/bin/bash
# Build Docker image trên server và deploy lên K8s (không cần Docker Hub).
# Usage:
#   ./build-deploy.sh               # dùng HEAD hiện tại
#   ./build-deploy.sh <full-sha>    # dùng commit cụ thể (từ CI)
#
# Rollback:
#   ./build-deploy.sh <old-sha>     # deploy lại image cũ (phải còn trong docker images)
#   docker images frontend-platform  # xem danh sách images đang giữ

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KYPO_DIR="/home/ubuntu/kypo-sp26"
DEPLOY_NAME="angular-frontend"
NAMESPACE="crczp"
IMAGE_NAME="frontend-platform"
KEEP_IMAGES=5
export LIBVIRT_DEFAULT_URI="${LIBVIRT_DEFAULT_URI:-qemu:///system}"

# Dùng 8 ký tự đầu của SHA để tag image
RAW_SHA="${1:-$(git -C "$SCRIPT_DIR" rev-parse HEAD)}"
SHA="${RAW_SHA:0:8}"
IMAGE="$IMAGE_NAME:$SHA"

# Guard: chặn build nếu dev config đang active
CONFIG_FILE="$SCRIPT_DIR/apps/cyberrangecz-platform/public/config.json"
if [ -f "$SCRIPT_DIR/apps/cyberrangecz-platform/public/config.json.bak" ]; then
    echo "ERROR: config.json.bak tồn tại — dev.sh đang chạy hoặc chưa thoát đúng cách."
    echo "       Terminate dev.sh trước khi build production."
    exit 1
fi
if grep -q "localhost:4200" "$CONFIG_FILE"; then
    echo "ERROR: config.json chứa 'localhost:4200' — đây là dev config, không phải production."
    echo "       Kiểm tra lại config.json trước khi build."
    exit 1
fi

echo "==> SHA   : $SHA"
echo "==> Image : $IMAGE"
echo ""

# Checkout đúng commit (quan trọng khi chạy từ CI với SHA cụ thể)
echo "==> Fetching code..."
git -C "$SCRIPT_DIR" fetch origin
git -C "$SCRIPT_DIR" checkout "$RAW_SHA"

# Build image
echo "==> Building Docker image..."
docker build -t "$IMAGE" "$SCRIPT_DIR"

# Helper: chạy lệnh trong VM qua vagrant
_in_vm() {
    docker run --rm -i \
        -e LIBVIRT_DEFAULT_URI \
        -v /var/run/libvirt/:/var/run/libvirt/ \
        -v ~/.vagrant.d:/.vagrant.d \
        -v "$KYPO_DIR":"$KYPO_DIR" \
        -w "$KYPO_DIR" --network host \
        vagrantlibvirt/vagrant-libvirt:latest \
        vagrant ssh -- "$@"
}

# Load image vào k3s containerd của VM
echo "==> Loading image vào k3s containerd..."
docker save "$IMAGE" | _in_vm "sudo k3s ctr images import -"

# Patch imagePullPolicy + cập nhật image + rollout
echo "==> Deploying..."
_in_vm "
    sudo kubectl patch deployment $DEPLOY_NAME -n $NAMESPACE \
        --type=json \
        -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/imagePullPolicy\",\"value\":\"IfNotPresent\"}]' \
        2>/dev/null || true
    sudo kubectl set image deployment/$DEPLOY_NAME \
        $DEPLOY_NAME=docker.io/library/$IMAGE \
        -n $NAMESPACE
    sudo kubectl rollout status deployment/$DEPLOY_NAME \
        -n $NAMESPACE --timeout=120s
"

echo ""
echo "==> Deploy thành công: $IMAGE"
echo ""

# Giữ KEEP_IMAGES images gần nhất, xóa cũ hơn
OLDEST=$(docker images "$IMAGE_NAME" --format "{{.Tag}}" | tail -n +$((KEEP_IMAGES + 1)))
if [ -n "$OLDEST" ]; then
    echo "==> Xóa images cũ (giữ $KEEP_IMAGES):"
    echo "$OLDEST" | while read -r tag; do
        echo "    - $IMAGE_NAME:$tag"
        docker rmi "$IMAGE_NAME:$tag" 2>/dev/null || true
    done
fi
