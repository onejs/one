import { ADMIN_EMAIL, APP_NAME } from '~/constants'
import {
  LegalList,
  LegalPage,
  LegalSection,
  LegalText,
} from '~/interface/pages/LegalPage'

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <LegalSection title="Introduction">
        <LegalText>
          Welcome to {APP_NAME}. We respect your privacy and are committed to protecting
          your personal data. This privacy policy will inform you about how we handle your
          personal data when you use our service.
        </LegalText>
      </LegalSection>

      <LegalSection title="Information We Collect">
        <LegalText>
          We collect information that you provide directly to us, including:
        </LegalText>
        <LegalList>
          <LegalText>• Account information (email, username, profile details)</LegalText>
          <LegalText>
            • Content you create, upload, or share through our service
          </LegalText>
          <LegalText>• Communications with us</LegalText>
          <LegalText>• Usage data and analytics</LegalText>
        </LegalList>
      </LegalSection>

      <LegalSection title="How We Use Your Information">
        <LegalText>We use the information we collect to:</LegalText>
        <LegalList>
          <LegalText>• Provide, maintain, and improve our services</LegalText>
          <LegalText>• Process your transactions and send related information</LegalText>
          <LegalText>• Send you technical notices</LegalText>
          <LegalText>• Respond to your comments and questions</LegalText>
          <LegalText>• Monitor and analyze trends, usage, and activities</LegalText>
        </LegalList>
      </LegalSection>

      <LegalSection title="Data Security">
        <LegalText>
          We implement appropriate technical and organizational measures to protect your
          personal data against unauthorized or unlawful processing, accidental loss,
          destruction, or damage.
        </LegalText>
      </LegalSection>

      <LegalSection title="Data Retention">
        <LegalText>
          We retain your personal information for as long as necessary to fulfill the
          purposes outlined in this privacy policy, unless a longer retention period is
          required by law.
        </LegalText>
      </LegalSection>

      <LegalSection title="Your Rights">
        <LegalText>You have the right to:</LegalText>
        <LegalList>
          <LegalText>• Access your personal data</LegalText>
          <LegalText>• Correct inaccurate data</LegalText>
          <LegalText>• Request deletion of your data</LegalText>
          <LegalText>• Object to processing of your data</LegalText>
          <LegalText>• Request data portability</LegalText>
        </LegalList>
      </LegalSection>

      <LegalSection title="Cookies and Tracking">
        <LegalText>
          We use cookies and similar tracking technologies to track activity on our
          service and hold certain information. You can instruct your browser to refuse
          all cookies or to indicate when a cookie is being sent.
        </LegalText>
      </LegalSection>

      <LegalSection title="Third-Party Services">
        <LegalText>
          We may employ third-party companies and individuals to facilitate our service,
          provide the service on our behalf, perform service-related services, or assist
          us in analyzing how our service is used. These third parties have access to your
          personal data only to perform these tasks on our behalf.
        </LegalText>
      </LegalSection>

      <LegalSection title="Children's Privacy">
        <LegalText>
          Our service is not directed to children under 13. We do not knowingly collect
          personal information from children under 13. If you are a parent or guardian and
          you are aware that your child has provided us with personal data, please contact
          us.
        </LegalText>
      </LegalSection>

      <LegalSection title="Changes to This Policy">
        <LegalText>
          We may update our privacy policy from time to time. We will notify you of any
          changes by posting the new privacy policy on this page and updating the "Last
          updated" date.
        </LegalText>
      </LegalSection>

      <LegalSection title="Contact Us">
        <LegalText>
          If you have any questions about this privacy policy, please contact us at{' '}
          {ADMIN_EMAIL}.
        </LegalText>
      </LegalSection>
    </LegalPage>
  )
}
