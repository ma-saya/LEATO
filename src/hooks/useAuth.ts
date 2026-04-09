'use client';

// ログイン機能を一時的に無効化中
// // ログインなしでもアプリを使用できるようにしています

import type { User as SupabaseUser } from '@supabase/supabase-js';

// 匿名ユーザーとして扱う（ログイン不要モード）
const ANONYMOUS_USER = {
    id: 'anonymous',
      email: 'guest@leato.app',
        app_metadata: {},
          user_metadata: { name: 'ゲスト' },
            aud: 'authenticated',
              created_at: new Date().toISOString(),
              } as unknown as SupabaseUser;
              
              export function useAuth() {
                  // 常にゲストユーザーとして動作（認証スキップ）
                    const currentUser: SupabaseUser | null = ANONYMOUS_USER;
                      const loading = false;
                      
                        const handleLogout = async () => {
                              // ログアウトは現在無効化中
                                  console.log('ログイン機能は一時的に無効化されています');
                        };
                        
                          return { currentUser, loading, handleLogout };
                          }
                          
                          /*
                          // --- 元のuseAuth（一時的にコメントアウト中）---
                          import { useState, useEffect } from 'react';
                          import { useRouter } from 'next/navigation';
                          import { createClient } from '@/lib/supabase/client';
                          
                          export function useAuth() {
                            const router = useRouter();
                              const supabase = createClient();
                                const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
                                  const [loading, setLoading] = useState(true);
                                  
                                    useEffect(() => {
                                        const fetchUser = async () => {
                                              const { data: { user } } = await supabase.auth.getUser();
                                                    setCurrentUser(user);
                                                          setLoading(false);
                        };
                            fetchUser();
                            
                                const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                                      setCurrentUser(session?.user ?? null);
                                            setLoading(false);
                        });
                        
                            return () => { subscription.unsubscribe(); };
                              }, [supabase.auth]);
                              
                                const handleLogout = async () => {
                                    await supabase.auth.signOut();
                                        router.push('/login');
                                            router.refresh();
                        };
                        
                          return { currentUser, loading, handleLogout };
                          }
                          */'