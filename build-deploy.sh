#!/bin/bash
# Deploy frontend image từ ghcr.io lên K8s.
# Usage:
#   ./build-deploy.sh ghcr.io/hoaanhtuc113/frontend-platform:abc12345
#   ./build-deploy.sh abc12345    # tự ghép image repo
#
# Rollback: ./build-deploy.sh <old-sha>

set -e

KYPO_DIR="/home/ubuntu/kypo-sp26"
DEPLOY_NAME="angular-frontend"
NAMESPACE="crczp"
IMAGE_REPO="ghcr.io/hoaanhtuc113/frontend-platform"
export LIBVIRT_DEFAULT_URI="${LIBVIRT_DEFAULT_URI:-qemu:///system}"

INPUT="${1:-}"
if [ -z "$INPUT" ]; then
    echo "Usage: ./build-deploy.sh <image-tag-or-sha>"
    echo "  Example: ./build-deploy.sh ghcr.io/hoaanhtuc113/frontend-platform:abc12345"
    echo "  Example: ./build-deploy.sh abc12345"
    exit 1
fi

# Nếu input là full image (có dấu /), dùng nguyên; nếu là SHA thì ghép repo
if echo "$INPUT" | grep -q '/'; then
    IMAGE="$INPUT"
else
    IMAGE="$IMAGE_REPO:${INPUT:0:8}"
fi

echo "==> Deploying: $IMAGE"

_in_vm() {
    docker run --rm \
        -e LIBVIRT_DEFAULT_URI \
        -v /var/run/libvirt/:/var/run/libvirt/ \
        -v ~/.vagrant.d:/.vagrant.d \
        -v "$KYPO_DIR":"$KYPO_DIR" \
        -w "$KYPO_DIR" --network host \
        vagrantlibvirt/vagrant-libvirt:latest \
        vagrant ssh -- "$@"
}

_in_vm "
    sudo kubectl set image deployment/$DEPLOY_NAME \
        $DEPLOY_NAME=$IMAGE \
        -n $NAMESPACE
    sudo kubectl rollout status deployment/$DEPLOY_NAME \
        -n $NAMESPACE --timeout=120s
"

echo ""
echo "==> Deploy thành công: $IMAGE"

# Cập nhật CUSTOM_FRONTEND_IMAGE và CUSTOM_FRONTEND_TAG trong 03-infrastructure-deploy.sh
# để lần rebuild tiếp theo dùng đúng image đã deploy gần nhất.
DEPLOY_SCRIPT="/home/ubuntu/kypo-sp26/scripts/03-infrastructure-deploy.sh"
if [ -f "$DEPLOY_SCRIPT" ]; then
    TAG="${IMAGE##*:}"
    REPO="${IMAGE%:*}"
    sed -i "s|^CUSTOM_FRONTEND_IMAGE=.*|CUSTOM_FRONTEND_IMAGE=\"${REPO}\"|" "$DEPLOY_SCRIPT"
    sed -i "s|^CUSTOM_FRONTEND_TAG=.*|CUSTOM_FRONTEND_TAG=\"${TAG}\"|" "$DEPLOY_SCRIPT"
    echo "==> 03-infrastructure-deploy.sh updated: image=${REPO} tag=${TAG}"
fi
