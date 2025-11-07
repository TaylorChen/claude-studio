#!/bin/bash

# Claude Studio - 启动脚本（带 Anthropic 环境变量）

echo "🚀 启动 Claude Studio..."
echo ""

# 设置 Anthropic 环境变量
export ANTHROPIC_BASE_URL="https://open.bigmodel.cn/api/anthropic"
export ANTHROPIC_AUTH_TOKEN="3a70f87b24f94be889da64421ec2489a.P8u046AUo8Q7AEXG"

echo "✅ 环境变量已设置:"
echo "   ANTHROPIC_BASE_URL=$ANTHROPIC_BASE_URL"
echo "   ANTHROPIC_AUTH_TOKEN=${ANTHROPIC_AUTH_TOKEN:0:20}..."
echo ""

# 检查 claude 是否可用
if command -v claude &> /dev/null; then
    echo "✅ Claude CLI 已安装"
    
    # 测试 claude 命令
    echo "🔍 测试 Claude CLI..."
    if claude --version &> /dev/null; then
        echo "✅ Claude CLI 可用"
    else
        echo "⚠️  Claude CLI 可能需要登录"
    fi
else
    echo "⚠️  Claude CLI 未安装"
fi

echo ""
echo "🎯 启动应用..."
echo ""

# 启动 Electron 应用
npm run dev

