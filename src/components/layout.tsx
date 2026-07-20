import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Clock, FileBadge, Sparkles, ShieldCheck, LogOut, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@workspace/replit-auth-web";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reflections", label: "Reflections", icon: FileText },
  { href: "/cpd", label: "CPD Log", icon: FileBadge },
  { href: "/practice", label: "Practice Hours", icon: Clock },
  { href: "/evidence", label: "Evidence", icon: Image },
];

function UserInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "User";

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-card border-r border-border shrink-0 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <FileBadge className="w-5 h-5" />
            </div>
            <span>NMC Revalidation</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin link */}
        <div className="px-4 pb-1">
          <Link href="/admin">
            <div className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
              "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              Admin
            </div>
          </Link>
        </div>

        {/* Upgrade CTA */}
        <div className="px-4 pb-3">
          <Link href="/pricing">
            <div className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
              "bg-primary/10 text-primary hover:bg-primary/15"
            )}>
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="font-semibold leading-tight">Upgrade to Pro</p>
                <p className="text-xs text-primary/70 font-normal">First month free</p>
              </div>
            </div>
          </Link>
        </div>

        {/* User profile + logout */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                {UserInitials(displayName)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              {user?.email && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              )}
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
