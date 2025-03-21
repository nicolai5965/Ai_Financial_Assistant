/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable strict mode for now to avoid issues with react 19 and to many logs in the console
  // Configuring the source directory
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
};

module.exports = nextConfig; 