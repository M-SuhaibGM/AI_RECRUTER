/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
            {
                protocol: "https",
                hostname: "utfs.io",
            },
        ],
    },

    // ✅ Add this — massively reduces bundle size
    experimental: {
        optimizePackageImports: [
            "lucide-react",
            "date-fns",
            "sonner",
            "@radix-ui/react-icons",
            "recharts", // if you use it
            "framer-motion", // if you use it
        ],
    },
};

export default nextConfig;