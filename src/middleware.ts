// ログイン機能を一時的に無効化中
// 元のコードはコメントアウトしてあります。復元するには下のコメントを外してください。

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // 認証チェックをスキップ - すべてのルートを許可
      return NextResponse.next();
      }

      export const config = {
        matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
        };

        /*
        // --- 元の認証middleware（一時的にコメントアウト中）---
        import { createServerClient } from '@supabase/ssr';
        import { NextResponse, type NextRequest } from 'next/server';

        export async function middleware(request: NextRequest) {
          let supabaseResponse = NextResponse.next({ request });
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                        {
                              cookies: {
                                      getAll() { return request.cookies.getAll(); },
                                              setAll(cookiesToSet) {
                                                        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                                                                  supabaseResponse = NextResponse.next({ request });
                                                                            cookiesToSet.forEach(({ name, value, options }) =>
                                                                                        supabaseResponse.cookies.set(name, value, options)
                                                                                                  );
                                                                                                          },
                                                                                                                },
                                                                                                                    }
                                                                                                                      );
                                                                                                                        const { data: { user } } = await supabase.auth.getUser();
                                                                                                                          const { pathname } = request.nextUrl;
                                                                                                                            const authPages = ['/login', '/signup'];
                                                                                                                              if (!user && !authPages.includes(pathname)) {
                                                                                                                                  return NextResponse.redirect(new URL('/login', request.url));
                                                                                                                                    }
                                                                                                                                      if (user && authPages.includes(pathname)) {
                                                                                                                                          return NextResponse.redirect(new URL('/', request.url));
                                                                                                                                            }
                                                                                                                                              return supabaseResponse;
                                                                                                                                              }
                                                                                                                                              export const config = {
                                                                                                                                                matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
                                                                                                                                                };
                                                                                                                                                */}
}