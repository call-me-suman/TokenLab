"use client";

// import { WagmiProvider } from "wagmi";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { config } from "../lib/wagmi";
// import { ReactNode, useState } from "react";

// interface Web3ProviderProps {
//   children: ReactNode;
// }

// export default function Web3Provider({ children }: Web3ProviderProps) {
//   const [queryClient] = useState(
//     () =>
//       new QueryClient({
//         defaultOptions: {
//           queries: {
//             staleTime: 60 * 1000,
//           },
//         },
//       })
//   );

//   return (
//     <WagmiProvider config={config}>
//       <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
//     </WagmiProvider>
//   );
// }

import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { hyperionConfig } from "@/lib/config";

type Props = {
  children: React.ReactNode;
};
const queryClient = new QueryClient();

const Web3Provider = ({ children }: Props) => {
  return (
    <WagmiProvider config={hyperionConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
export default Web3Provider;
