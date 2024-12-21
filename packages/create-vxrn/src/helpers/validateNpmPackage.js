import validateProjectName from 'validate-npm-package-name';
export function validateNpmName(name) {
    const nameValidation = validateProjectName(name);
    if (nameValidation.validForNewPackages) {
        return { valid: true };
    }
    return {
        valid: false,
        problems: [...(nameValidation.errors || []), ...(nameValidation.warnings || [])],
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGVOcG1QYWNrYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmFsaWRhdGVOcG1QYWNrYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sbUJBQW1CLE1BQU0sMkJBQTJCLENBQUE7QUFFM0QsTUFBTSxVQUFVLGVBQWUsQ0FBQyxJQUFZO0lBSTFDLE1BQU0sY0FBYyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2hELElBQUksY0FBYyxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDdkMsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0lBRUQsT0FBTztRQUNMLEtBQUssRUFBRSxLQUFLO1FBQ1osUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUM7S0FDakYsQ0FBQTtBQUNILENBQUMifQ==