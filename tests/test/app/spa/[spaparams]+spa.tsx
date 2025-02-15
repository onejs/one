import { useParams } from 'one'

export default () => {
  const params = useParams<any>()

  return <div id="spa-page">{params.spaparams}</div>
}
