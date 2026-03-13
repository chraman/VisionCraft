Plan to implement │
│ │
│ Frontend Architecture Plan — apps/web/src/ │
│ │
│ Context │
│ │
│ apps/web/src/main.tsx is a stub (<div>Coming Soon</div>). All shared packages │
│ (types, api-client, store, feature-flags, ui, utils, config) are fully │
│ scaffolded. This plan wires everything together into a production-grade, modular │
│ React 18 frontend — feature-first structure, strict typing, flag-gated, observable. │
│ │
│ --- │
│ Directory Structure │
│ │
│ apps/web/src/ │
│ ├── main.tsx UPDATE — mounts full provider tree │
│ ├── app/ │
│ │ ├── App.tsx Root component — RouterProvider inside providers │
│ │ ├── providers.tsx Composes QueryClientProvider, ErrorBoundary, Sentry, PostHog │
│ │ └── router.tsx React Router v6 route tree, all pages lazy-loaded │
│ ├── lib/ │
│ │ ├── queryClient.ts TanStack QueryClient singleton (staleTime, retry, Sentry hooks) │
│ │ ├── sentry.ts initSentry() — reads VITE*SENTRY_DSN, graceful no-op if absent │
│ │ └── analytics.ts initAnalytics() — PostHog init + resetAnalyticsUser() │
│ ├── services/ Thin typed wrappers over apiClient — no business logic │
│ │ ├── auth.service.ts │
│ │ ├── image.service.ts │
│ │ └── user.service.ts │
│ ├── hooks/ App-level cross-feature hooks │
│ │ ├── useCurrentUser.ts useQuery(['currentUser']) → syncs Zustand authStore on success │
│ │ └── useTokenRefresh.ts Runs once on mount via useEffect+useRef, calls refreshToken() │
│ │ then setAccessToken() BEFORE any queries fire │
│ ├── components/ App-level shared components (not in packages/ui) │
│ │ ├── ProtectedRoute.tsx Auth guard + optional flag guard; redirects or shows fallback │
│ │ ├── AppErrorBoundary.tsx Sentry-integrated class component error boundary │
│ │ ├── PageLoader.tsx Full-page <Spinner /> — used as <Suspense> fallback │
│ │ └── QuotaGuard.tsx Reads useQuota(); shows upgrade CTA when quota exhausted │
│ ├── layouts/ │
│ │ ├── AppLayout.tsx Authenticated shell — sidebar nav + <Outlet /> │
│ │ │ Mounts useTokenRefresh(), useCurrentUser(), page view tracking │
│ │ ├── AuthLayout.tsx Centered card — for login/register pages │
│ │ └── index.ts │
│ └── features/ │
│ ├── auth/ │
│ │ ├── components/ LoginForm, RegisterForm, OAuthButton │
│ │ ├── hooks/ useLogin, useRegister, useLogout │
│ │ ├── pages/ LoginPage, RegisterPage │
│ │ └── index.ts │
│ ├── generate/ │
│ │ ├── components/ GenerateTabs, TextPromptForm, ImageUploader, │
│ │ │ GenerationProgress, ResultDisplay │
│ │ ├── hooks/ useTextGeneration, useImgToImg, useJobStatus │
│ │ ├── pages/ GeneratePage │
│ │ └── index.ts │
│ ├── gallery/ │
│ │ ├── components/ ImageGrid, ImageCard, GalleryLightbox │
│ │ ├── hooks/ useSavedImages, useImageActions │
│ │ ├── pages/ GalleryPage │
│ │ └── index.ts │
│ └── profile/ │
│ ├── components/ ProfileForm, QuotaDisplay │
│ ├── hooks/ useProfile, useQuota │
│ ├── pages/ ProfilePage │
│ └── index.ts │
│ │
│ Total new files: 50 (including main.tsx update) │
│ │
│ --- │
│ Architecture Principles │
│ │
│ 1. Feature-First Modules │
│ │
│ Each feature is self-contained: components/ → hooks/ → services/ → apiClient. │
│ The barrel index.ts controls the public API. No feature imports from another feature's │
│ internals — only from barrel exports or components//hooks//services/ at the app root. │
│ │
│ 2. Layer Contract │
│ │
│ Page → Feature Hook → Service fn → apiClient (from @ai-platform/api-client) │
│ - Pages compose hooks + components — no direct apiClient calls │
│ - Hooks use TanStack Query (useQuery / useMutation / useInfiniteQuery) + call services │
│ - Services are pure async functions returning typed domain objects using API_ROUTES │
│ from @ai-platform/config and unwrapResponse() from @ai-platform/api-client │
│ │
│ 3. State Split │
│ │
│ ┌────────────────────────────────────────────────┬──────────────────────┬────────────────────────────────────────┐ │
│ │ State type │ Owner │ Reason │ │
│ ├────────────────────────────────────────────────┼──────────────────────┼────────────────────────────────────────┤ │
│ │ Server data (user, images, quota, job) │ TanStack Query │ Caching, dedup, stale-while-revalidate │ │
│ ├────────────────────────────────────────────────┼──────────────────────┼────────────────────────────────────────┤ │
│ │ Auth UI state (isAuthenticated, user) │ Zustand useAuthStore │ Synchronous reads across tree │ │
│ ├────────────────────────────────────────────────┼──────────────────────┼────────────────────────────────────────┤ │
│ │ Ephemeral form state │ React Hook Form │ Zero re-renders during typing │ │
│ ├────────────────────────────────────────────────┼──────────────────────┼────────────────────────────────────────┤ │
│ │ Ephemeral UI state (lightbox open, active tab) │ useState │ Local — no sharing needed │ │
│ └────────────────────────────────────────────────┴──────────────────────┴────────────────────────────────────────┘ │
│ │
│ 4. Route-Level Code Splitting │
│ │
│ Every page is React.lazy() + <Suspense fallback={<PageLoader />}>. │
│ Initial bundle contains only: main.tsx, app/providers.tsx, app/router.tsx, │
│ lib/queryClient.ts, lib/sentry.ts, lib/analytics.ts, components/PageLoader.tsx. │
│ │
│ 5. Token Refresh Strategy │
│ │
│ useTokenRefresh runs once in AppLayout on mount. It calls auth.service.refreshToken() │
│ (uses the httpOnly refresh cookie via withCredentials: true on apiClient) then calls │
│ setAccessToken(token) from @ai-platform/api-client. This completes before TanStack │
│ Query fires its first useCurrentUser fetch because AppLayout renders <Outlet> only │
│ after useCurrentUser resolves. │
│ │
│ --- │
│ Route Table │
│ │
│ ┌───────────┬───────────────────────┬────────────┬────────────────────┬───────────────────────┐ │
│ │ Path │ Page │ Layout │ Auth Required │ Flag Gate │ │
│ ├───────────┼───────────────────────┼────────────┼────────────────────┼───────────────────────┤ │
│ │ /login │ LoginPage │ AuthLayout │ redirect if authed │ — │ │
│ ├───────────┼───────────────────────┼────────────┼────────────────────┼───────────────────────┤ │
│ │ /register │ RegisterPage │ AuthLayout │ redirect if authed │ — │ │
│ ├───────────┼───────────────────────┼────────────┼────────────────────┼───────────────────────┤ │
│ │ /generate │ GeneratePage │ AppLayout │ yes │ tabs gated internally │ │
│ ├───────────┼───────────────────────┼────────────┼────────────────────┼───────────────────────┤ │
│ │ /gallery │ GalleryPage │ AppLayout │ yes │ — │ │
│ ├───────────┼───────────────────────┼────────────┼────────────────────┼───────────────────────┤ │
│ │ /profile │ ProfilePage │ AppLayout │ yes │ — │ │
│ ├───────────┼───────────────────────┼────────────┼────────────────────┼───────────────────────┤ │
│ │ * │ NotFoundPage (inline) │ none │ — │ — │ │
│ └───────────┴───────────────────────┴────────────┴────────────────────┴───────────────────────┘ │
│ │
│ ProtectedRoute wraps every authenticated route. It reads useAuthStore() for │
│ isLoading / isAuthenticated. Optional flag prop gates by feature flag via useFlag(). │
│ │
│ --- │
│ QueryClient Configuration │
│ │
│ // lib/queryClient.ts │
│ new QueryClient({ │
│ defaultOptions: { │
│ queries: { │
│ staleTime: 60*000, // 1 min default │
│ gcTime: 300_000, // 5 min │
│ refetchOnWindowFocus: false, │
│ retry: (count, err) => { │
│ // Never retry 4xx (client errors — deterministic) │
│ if (isAxiosError(err) && err.response?.status < 500) return false; │
│ return count < 2; // Up to 2 retries on 5xx / network │
│ }, │
│ }, │
│ }, │
│ queryCache: new QueryCache({ │
│ onError: (err) => Sentry.captureException(err), │
│ }), │
│ mutationCache: new MutationCache({ │
│ onError: (err) => Sentry.captureException(err), │
│ }), │
│ }) │
│ │
│ Per-query overrides: │
│ │
│ ┌─────────────────┬───────────┬────────────────────────────────────────────┐ │
│ │ Query Key │ staleTime │ Notes │ │
│ ├─────────────────┼───────────┼────────────────────────────────────────────┤ │
│ │ ['currentUser'] │ 5 min │ Refetched on window focus override: true │ │
│ ├─────────────────┼───────────┼────────────────────────────────────────────┤ │
│ │ ['savedImages'] │ 2 min │ useInfiniteQuery with cursor pagination │ │
│ ├─────────────────┼───────────┼────────────────────────────────────────────┤ │
│ │ ['job', jobId] │ 0 │ SSE-updated; polling fallback at 2s │ │
│ ├─────────────────┼───────────┼────────────────────────────────────────────┤ │
│ │ ['quota'] │ 1 min │ refetchInterval: 300_000 │ │
│ ├─────────────────┼───────────┼────────────────────────────────────────────┤ │
│ │ ['profile'] │ 5 min │ Invalidated on useProfile mutation success │ │
│ └─────────────────┴───────────┴────────────────────────────────────────────┘ │
│ │
│ --- │
│ Service Function Signatures │
│ │
│ auth.service.ts │
│ │
│ login(credentials: LoginFormData): Promise<{ user: User; accessToken: string }> │
│ register(credentials: RegisterFormData): Promise<{ user: User; accessToken: string }> │
│ logout(): Promise<void> │
│ refreshToken(): Promise<{ accessToken: string }> │
│ loginWithGoogle(): void // redirects — not async │
│ │
│ image.service.ts │
│ │
│ generateFromText(req: GenerateTextRequest): Promise<GenerateJobResponse> │
│ generateFromImage(req: GenerateImageRequest): Promise<GenerateJobResponse> │
│ getJobStatus(jobId: string): Promise<GenerationJob> │
│ getPresignedUploadUrl(filename: string, contentType: string): Promise<{ uploadUrl: string; key: string }> │
│ uploadFileToS3(uploadUrl: string, file: File): Promise<void> // direct PUT — no apiClient │
│ getSavedImages(params: CursorPaginationParams): Promise<PaginatedResponse<Image>> │
│ saveImage(imageId: string): Promise<void> │
│ deleteImage(imageId: string): Promise<void> │
│ │
│ user.service.ts │
│ │
│ getCurrentUser(): Promise<User> │
│ updateProfile(data: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<User> │
│ getQuota(): Promise<UserQuota> │
│ │
│ All services use API_ROUTES constants from @ai-platform/config and │
│ unwrapResponse() from @ai-platform/api-client. │
│ │
│ --- │
│ Zod Schemas │
│ │
│ ┌──────────────────────┬─────────────────────────────────────────────────┬───────────────────────────────────────────────┐ │
│ │ Schema │ File │ Key constraints │ │
│ ├──────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────┤ │
│ │ loginSchema │ features/auth/components/LoginForm.tsx │ email(), password min 8 │ │
│ ├──────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────┤ │
│ │ registerSchema │ features/auth/components/RegisterForm.tsx │ + name, confirmPassword .refine() match │ │
│ ├──────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────┤ │
│ │ textGenerationSchema │ features/generate/components/TextPromptForm.tsx │ prompt 3–1000, aspectRatio enum, quality enum │ │
│ ├──────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────┤ │
│ │ imgToImgSchema │ features/generate/components/ImageUploader.tsx │ prompt 3–1000, strength 0.1–1.0 │ │
│ ├──────────────────────┼─────────────────────────────────────────────────┼───────────────────────────────────────────────┤ │
│ │ profileSchema │ features/profile/components/ProfileForm.tsx │ name 2–100, avatarUrl optional URL │ │
│ └──────────────────────┴─────────────────────────────────────────────────┴───────────────────────────────────────────────┘ │
│ │
│ --- │
│ SSE / Real-time Job Status │
│ │
│ useJobStatus(jobId) in features/generate/hooks/: │
│ 1. Opens native EventSource at /api/v1/images/jobs/:jobId/events │
│ 2. On each status message: queryClient.setQueryData(['job', jobId], updatedJob) │
│ 3. On COMPLETED: closes EventSource, invalidates ['savedImages'] │
│ 4. On EventSource onerror: falls back to refetchInterval: 2000 on useQuery │
│ 5. On unmount: eventSource.close() │
│ │
│ --- │
│ Feature Flag Integration │
│ │
│ - Tabs: GenerateTabs reads useFlag('image.text_generation.enabled') and │
│ useFlag('image.img2img.enabled') — only renders enabled tabs │
│ - Routes: <ProtectedRoute flag="image.img2img.enabled"> for any future flag-gated pages │
│ - Never: inline process.env or hardcoded booleans for feature state │
│ │
│ --- │
│ Analytics Event Map │
│ │
│ ┌───────────────────────────────────┬──────────────────────┬───────────────────────────────────────────┐ │
│ │ User Action │ Event │ Fired In │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ Route change │ page_view │ AppLayout — useEffect on useLocation() │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ First register field focus │ signup_started │ RegisterForm — first field onFocus │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ Registration success │ signup_completed │ useRegister — onSuccess │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ Login success │ login │ useLogin — onSuccess │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ Google button click │ oauth_clicked │ OAuthButton — onClick │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ Generate text submit │ generation_started │ useTextGeneration — onMutate │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ Job COMPLETED status │ generation_completed │ useJobStatus — on COMPLETED event │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ Generation failure │ generation_failed │ useTextGeneration / useImgToImg — onError │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ File rejected by dropzone │ upload_failed │ ImageUploader — onDropRejected │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ Save image │ image_saved │ useImageActions — onSuccess │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ Delete image │ image_deleted │ useImageActions — onSuccess │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ Quota guard rendered (over limit) │ quota_exceeded │ QuotaGuard — useEffect │ │
│ ├───────────────────────────────────┼──────────────────────┼───────────────────────────────────────────┤ │
│ │ Upgrade CTA click │ upgrade_clicked │ QuotaGuard + QuotaDisplay — onClick │ │
│ └───────────────────────────────────┴──────────────────────┴───────────────────────────────────────────┘ │
│ │
│ track() imported from @ai-platform/utils. All event shapes typed in │
│ @ai-platform/types/src/analytics.types.ts. │
│ │
│ --- │
│ Error Handling Pattern │
│ │
│ // All mutations follow this pattern: │
│ useMutation({ │
│ mutationFn: ..., │
│ onError: (err) => { │
│ // Sentry.captureException auto-fired by MutationCache.onError in queryClient.ts │
│ toast.error(getErrorMessage(err)); // getErrorMessage from @ai-platform/utils │
│ track({ event: '<event_failed>', ... }); │
│ }, │
│ }) │
│ │
│ AppErrorBoundary (Sentry-integrated) wraps all routes to catch render errors. │
│ AppError from @ai-platform/types is used exclusively — never throw new Error(). │
│ │
│ --- │
│ Package Fix Required │
│ │
│ browser-image-compression is listed under devDependencies in apps/web/package.json │
│ but is imported in production code (ImageUploader.tsx). Must be moved to dependencies │
│ before implementing that component. │
│ │
│ --- │
│ Implementation Sequence │
│ │
│ Step: 1 — Foundation │
│ Files: lib/*, main.tsx, app/providers.tsx, app/App.tsx, components/PageLoader.tsx, components/AppErrorBoundary.tsx │
│ Can test independently: App renders blank with monitoring active │
│ ──────────────────────────────────────── │
│ Step: 2 — Services + Hooks │
│ Files: services/_, hooks/useCurrentUser.ts, hooks/useTokenRefresh.ts │
│ Can test independently: Unit tests with mocked apiClient │
│ ──────────────────────────────────────── │
│ Step: 3 — Routing Shell │
│ Files: layouts/_, components/ProtectedRoute.tsx, app/router.tsx │
│ Can test independently: Stub pages, routing works │
│ ──────────────────────────────────────── │
│ Step: 4 — Auth Feature │
│ Files: features/auth/** │
│ Can test independently: Full login/register/OAuth flow │
│ ──────────────────────────────────────── │
│ Step: 5 — Profile Feature │
│ Files: features/profile/** │
│ Can test independently: useQuota needed by QuotaGuard │
│ ──────────────────────────────────────── │
│ Step: 6 — Gallery Feature │
│ Files: features/gallery/** │
│ Can test independently: Infinite scroll, lightbox, save/delete │
│ ──────────────────────────────────────── │
│ Step: 7 — Generate Feature │
│ Files: features/generate/**, components/QuotaGuard.tsx │
│ Can test independently: Most complex — SSE, upload, crop │
│ ──────────────────────────────────────── │
│ Step: 8 — Polish │
│ Files: Wire useTokenRefresh, page view tracking, identifyUser, ReactQueryDevtools │
│ Can test independently: — │
│ │
│ --- │
│ Testing Strategy │
│ │
│ Vitest + @testing-library/react — test files co-located as \*.test.ts(x). │
│ │
│ src/test-setup.ts mocks: │
│ - @ai-platform/feature-flags → returns true for Phase 1 flags │
│ - @ai-platform/store → default unauthenticated AuthState │
│ - lib/sentry.ts → no-op initSentry, no-op captureException │
│ - lib/analytics.ts → no-op all exports │
│ - posthog-js → no-op │
│ │
│ Key test patterns: │
│ - Services: mock apiClient; assert correct URL + body, setAccessToken called, throws on 4xx │
│ - Hooks: renderHook() inside createQueryWrapper() factory; mock service module; assert cache state via queryClient.getQueryData() │
│ - Components: render() with providers wrapper; userEvent for interactions; assert by ARIA roles/labels │
│ - ProtectedRoute: 4 cases — loading, unauthenticated, flag-disabled, fully authorized │
│ - useJobStatus: mock EventSource class with trigger() helper; assert cache updates on SSE messages │
│ │
│ Coverage gate: 85% lines/functions/branches on all new code. │
│ Excluded from coverage: all index.ts barrel files, main.tsx, app/App.tsx. │
│ │
│ --- │
│ Critical File References │
│ │
│ ┌─────────────────────────────────────┬───────────────────────────────────────────────────┐ │
│ │ File │ Role │ │
│ ├─────────────────────────────────────┼───────────────────────────────────────────────────┤ │
│ │ apps/web/src/main.tsx │ Entry point — update to mount full provider tree │ │
│ ├─────────────────────────────────────┼───────────────────────────────────────────────────┤ │
│ │ apps/web/src/app/router.tsx │ Route tree — single source of truth for all paths │ │
│ ├─────────────────────────────────────┼───────────────────────────────────────────────────┤ │
│ │ apps/web/src/lib/queryClient.ts │ QueryClient singleton — must be created once │ │
│ ├─────────────────────────────────────┼───────────────────────────────────────────────────┤ │
│ │ packages/api-client/src/index.ts │ apiClient, setAccessToken, unwrapResponse │ │
│ ├─────────────────────────────────────┼───────────────────────────────────────────────────┤ │
│ │ packages/store/src/authSlice.ts │ useAuthStore — Zustand auth contract │ │
│ ├─────────────────────────────────────┼───────────────────────────────────────────────────┤ │
│ │ packages/types/src/image.types.ts │ Domain types for generate + gallery features │ │
│ ├─────────────────────────────────────┼───────────────────────────────────────────────────┤ │
│ │ packages/config/src/constants.ts │ API_ROUTES — all route paths │ │
│ ├─────────────────────────────────────┼───────────────────────────────────────────────────┤ │
│ │ packages/feature-flags/src/index.ts │ useFlag, useFlags, useFlagValue │ │
│ ├─────────────────────────────────────┼───────────────────────────────────────────────────┤ │
│ │ packages/ui/src/index.ts │ Button, Card, Input, Badge, Spinner, cn │ │
│ ├─────────────────────────────────────┼───────────────────────────────────────────────────┤ │
│ │ packages/utils/src/errors.ts │ getErrorMessage │ │
│ ├─────────────────────────────────────┼───────────────────────────────────────────────────┤ │
│ │ packages/utils/src/analytics.ts │ track() │ │
│ └─────────────────────────────────────┴───────────────────────────────────────────────────┘
