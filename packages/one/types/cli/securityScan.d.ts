export type SecurityFinding = {
    file: string;
    label: string;
    match: string;
    line: number;
};
export declare function scanBundleForSecrets(distDir: string, userSafePatterns?: (string | RegExp)[]): Promise<{
    clean: boolean;
    findings: SecurityFinding[];
}>;
/**
 * runs the security scan based on config level
 * returns true if the build should continue, false if it should fail
 */
export declare function runSecurityScan(clientDir: string, level: 'warn' | 'error', safePatterns?: (string | RegExp)[]): Promise<boolean>;
//# sourceMappingURL=securityScan.d.ts.map