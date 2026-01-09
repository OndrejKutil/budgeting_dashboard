import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Calendar, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { logout, userId } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Manage your account settings" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 lg:grid-cols-3"
      >
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center pt-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-gradient-blurple text-2xl font-bold text-white">
                U
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-xl font-bold font-display">User</h2>
            <p className="text-sm text-muted-foreground">Personal Account</p>
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="font-medium">user@example.com</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-sm">{userId || 'demo-user-123'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">January 2026</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
