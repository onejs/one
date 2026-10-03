import { APP_NAME } from '~/constants'
import { LegalPage, LegalSection, LegalText } from '~/interface/pages/LegalPage'

export default function EULAPage() {
  return (
    <LegalPage title="End User License Agreement (EULA)">
      <LegalText>
        Welcome to {APP_NAME}! Before using the app, please review this agreement. By
        continuing to use {APP_NAME}, you agree to comply with the following terms:
      </LegalText>

      <LegalSection title="1. User-Generated Content">
        <LegalText>
          All content you create or share must follow {APP_NAME}'s rules.
        </LegalText>
        <LegalText>
          Objectionable, abusive, or illegal content is strictly prohibited.
        </LegalText>
      </LegalSection>

      <LegalSection title="2. Account Suspension & Removal">
        <LegalText>
          {APP_NAME} reserves the right to remove content, suspend accounts, or take other
          action for violations at any time.
        </LegalText>
      </LegalSection>

      <LegalSection title="3. Acceptance">
        <LegalText>
          By using {APP_NAME}, you agree to this EULA and our Terms of Service and Privacy
          Policy.
        </LegalText>
      </LegalSection>
    </LegalPage>
  )
}
