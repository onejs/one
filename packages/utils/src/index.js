export function mustReplace(source, replacements) {
    for (const { find, replace } of replacements) {
        const found = find instanceof RegExp ? find.test(source) : source.includes(find);
        if (!found) {
            throw new Error(`Substring or pattern "${find}" not found in the string.`);
        }
        // Perform the replacement
        source = source.replace(find, replace);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxVQUFVLFdBQVcsQ0FDekIsTUFBYyxFQUNkLFlBR0c7SUFFSCxLQUFLLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksWUFBWSxFQUFFLENBQUM7UUFDN0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxZQUFZLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNoRixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixJQUFJLDRCQUE0QixDQUFDLENBQUE7UUFDNUUsQ0FBQztRQUVELDBCQUEwQjtRQUMxQixNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDeEMsQ0FBQztBQUNILENBQUMifQ==