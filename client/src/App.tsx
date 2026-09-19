import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout, ThemeProvider } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SearchPage from "@/pages/search";
import ChannelPage from "@/pages/channel";
import Watch from "@/pages/watch";
import Saved from "@/pages/saved";

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/search" component={SearchPage} />
        <Route path="/channel/:id" component={ChannelPage} />
        <Route path="/watch/:id" component={Watch} />
        <Route path="/saved" component={Saved} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ThemeProvider>
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
