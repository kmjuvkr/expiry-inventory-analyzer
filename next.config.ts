import type { NextConfig } from 'next';

// GitHub Pages(프로젝트 페이지)는 https://<user>.github.io/<repo>/ 하위 경로로 서빙되므로
// 프로덕션 빌드에서만 basePath / assetPrefix 를 적용한다. (로컬 dev 는 루트 그대로)
const repo = 'expiry-inventory-analyzer';
const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? `/${repo}` : '';

const nextConfig: NextConfig = {
  output: 'export', // 정적 HTML/JS 로 빌드 (서버 불필요, GitHub Pages 서빙 가능)
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
