import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Short link for cold email; the UTM tags feed signup attribution.
      {
        source: "/tx",
        destination: "/?utm_source=email&utm_medium=cold&utm_campaign=tx_oct26",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
