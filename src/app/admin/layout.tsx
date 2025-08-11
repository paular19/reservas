// app/admin/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/app/lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { ADMIN_EMAILS } from '@/app/lib/autorizados';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminTabs } from './components/Tabs';

// Importaciones de shadcn/ui
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error en login:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="space-y-4">
          <Skeleton className="h-12 w-[300px]" />
          <Skeleton className="h-10 w-[200px] mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Acceso Administrador</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={login}
              className="w-full"
              variant="default"
            >
              Ingresar con Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ADMIN_EMAILS.includes(user.email)) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Alert variant="destructive">
              <AlertTitle>Acceso denegado</AlertTitle>
              <AlertDescription>
                El email {user.email} no está autorizado.
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={logout}
              variant="outline"
              className="w-full"
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Header responsive */}
      <header className="bg-background border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <h1 className="text-lg md:text-xl font-medium">Panel Admin</h1>
          
          {/* Menú para móviles */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.photoURL} />
                    <AvatarFallback>
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[120px]">{user.email}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Menú para desktop */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback>
                  {user.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate max-w-[160px]">
                {user.email}
              </span>
            </div>
            <Button 
              onClick={logout}
              variant="destructive"
              size="sm"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Nav responsive */}
      <nav className="bg-background border-b">
        <div className="container px-4 overflow-x-auto">
          <div className="w-[600px] md:w-full">
            <AdminTabs />
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="container py-4 px-2 sm:py-6 sm:px-4">
        {children}
      </main>
    </div>
  );
}