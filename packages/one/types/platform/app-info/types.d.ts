export interface AppInfo {
    /** user-visible version: CFBundleShortVersionString / versionName */
    readonly version: string | null;
    /** binary build: CFBundleVersion / versionCode (stringified) */
    readonly build: string | null;
    /** install identity: CFBundleIdentifier / applicationId */
    readonly applicationId: string | null;
}
//# sourceMappingURL=types.d.ts.map