// @ts-ignore
import getDevServer from 'react-native/Libraries/Core/Devtools/getDevServer';
let location;
export function getDevServerLocation() {
    if (!location) {
        const { url } = getDevServer();
        const origin = url.replace(/\/$/, '');
        const host = origin.replace(/https?:\/\//, '');
        location = {
            host,
            hostname: host.split(':')[0],
            href: url,
            origin,
            pathname: url.split(host)[1],
            port: host.split(':')[1],
            protocol: (url.match(/^([a-z])+:\/\//) || [undefined, undefined])[1],
        };
    }
    return location;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0RGV2U2VydmVyTG9jYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXREZXZTZXJ2ZXJMb2NhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxhQUFhO0FBQ2IsT0FBTyxZQUFZLE1BQU0sbURBQW1ELENBQUE7QUFZNUUsSUFBSSxRQUF1QyxDQUFBO0FBRTNDLE1BQU0sVUFBVSxvQkFBb0I7SUFDbEMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2QsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLFlBQVksRUFBcUIsQ0FBQTtRQUNqRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5QyxRQUFRLEdBQUc7WUFDVCxJQUFJO1lBQ0osUUFBUSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVCLElBQUksRUFBRSxHQUFHO1lBQ1QsTUFBTTtZQUNOLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsUUFBUSxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3JFLENBQUE7SUFDSCxDQUFDO0lBRUQsT0FBTyxRQUFRLENBQUE7QUFDakIsQ0FBQyJ9