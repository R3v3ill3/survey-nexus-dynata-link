
import { ReactNode } from "react";
import GlobalNavigation from "./GlobalNavigation";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <GlobalNavigation />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;
