import { Slot } from 'one'
import { TopNav } from '../../../components/TopNav'
import { ContainerDocs } from '../../../features/site/Containers'

export default function PlanLayout() {
  return (
    <>
      <TopNav />
      <ContainerDocs>
        <Slot />
      </ContainerDocs>
    </>
  )
}
