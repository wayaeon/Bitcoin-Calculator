/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle OGL library binary files and shaders
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ['raw-loader']
    });

    // Exclude binary files from parsing
    config.module.rules.push({
      test: /\.(bin|dat|wasm)$/,
      type: 'asset/resource'
    });

    // Ignore SES warnings and OGL parsing errors
    config.ignoreWarnings = [
      /SES/,
      /lockdown-install\.js/,
      /Module parse failed: Unexpected character/,
      /ogl/,
      /Triangle\.js/
    ];

    // Add fallbacks for Node.js modules that might be used by OGL
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false
    };

    return config;
  },
  // Disable SES for development
  experimental: {
    esmExternals: 'loose'
  },
  // Add transpilePackages for OGL if needed
  transpilePackages: ['ogl']
};

export default nextConfig;
