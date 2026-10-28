import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Short links for cold email; the UTM tags feed signup attribution. Since
      // 2026-10-28 they land on the no-signup /try demo, not the homepage.
      {
        source: "/tx",
        destination: "/try?utm_source=email&utm_medium=cold&utm_campaign=tx_oct26",
        permanent: false,
      },
      {
        source: "/fl",
        destination: "/try?utm_source=email&utm_medium=cold&utm_campaign=fl_oct26",
        permanent: false,
      },
      {
        source: "/go",
        destination: "/try?utm_source=email&utm_medium=cold&utm_campaign=states_oct26",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
