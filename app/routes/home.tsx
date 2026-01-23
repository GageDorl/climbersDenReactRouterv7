import type { Route } from "./+types/home";
import { redirect } from "react-router";
import { getUserId } from "../lib/auth.server";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  
  // If already logged in, redirect to feed
  if (userId) {
    return redirect('/posts');
  }
  
  return {};
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "climbersDen - Connect with Climbers Worldwide" },
    { name: "description", content: "Join the climbing community. Share your adventures, discover new crags, track your progress." },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">climbersDen</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12">
            Connect with climbers, discover crags, track your progress, and plan your next adventure.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a href="/auth/register">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                Get Started
              </Button>
            </a>
            <a href="/auth/login">
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                Sign In
              </Button>
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-20">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <CardTitle>Connect with Climbers</CardTitle>
              <CardDescription>
                Follow friends, share your climbing adventures, and build your climbing community.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <CardTitle>Discover Crags</CardTitle>
              <CardDescription>
                Find climbing areas near you with live weather forecasts and detailed route information.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <CardTitle>Track Progress</CardTitle>
              <CardDescription>
                Log your climbs, rate routes, and watch your climbing journey unfold over time.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <Card className="max-w-2xl mx-auto bg-linear-to-r from-blue-600 to-blue-700 text-white border-0">
            <CardHeader>
              <CardTitle className="text-white text-3xl">Ready to start climbing?</CardTitle>
              <CardDescription className="text-blue-100 text-lg">
                Join thousands of climbers sharing their passion for the vertical world.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" variant="outline" className="bg-white text-blue-600 hover:bg-blue-50">
                <a href="/auth/register">Create Your Free Account</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
