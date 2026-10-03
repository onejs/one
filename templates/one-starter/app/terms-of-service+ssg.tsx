import { ADMIN_EMAIL, APP_NAME } from '~/constants'
import {
  LegalList,
  LegalPage,
  LegalSection,
  LegalText,
} from '~/interface/pages/LegalPage'

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service">
      <LegalSection title="Agreement to Terms">
        <LegalText>
          By accessing or using {APP_NAME}, you agree to be bound by these Terms of
          Service. If you disagree with any part of these terms, you may not access the
          service.
        </LegalText>
      </LegalSection>

      <LegalSection title="Source License">
        <LegalText>
          This starter source code is free and open source under the MIT License included with
          the source. These Terms of Service apply to the hosted demonstration and do not
          restrict the permissions granted by that license.
        </LegalText>
      </LegalSection>

      <LegalSection title="User Accounts">
        <LegalText>
          When you create an account with us, you must provide accurate, complete, and
          current information. You are responsible for safeguarding your account and for
          all activities that occur under your account.
        </LegalText>
      </LegalSection>

      <LegalSection title="User Content">
        <LegalText>
          You retain all rights to any content you submit, post, or display on or through
          the service. By submitting content, you grant us a worldwide, non-exclusive,
          royalty-free license to use, reproduce, modify, and distribute your content in
          connection with operating the service.
        </LegalText>
      </LegalSection>

      <LegalSection title="Prohibited Uses">
        <LegalText>You may not use {APP_NAME} to:</LegalText>
        <LegalList>
          <LegalText>• Violate any laws or regulations</LegalText>
          <LegalText>• Infringe upon the rights of others</LegalText>
          <LegalText>• Distribute spam, malware, or harmful content</LegalText>
          <LegalText>• Harass, abuse, or harm other users</LegalText>
          <LegalText>• Attempt to gain unauthorized access to the service</LegalText>
          <LegalText>• Impersonate any person or entity</LegalText>
        </LegalList>
      </LegalSection>

      <LegalSection title="Intellectual Property">
        <LegalText>
          The service and its original content, features, and functionality are and will
          remain the exclusive property of {APP_NAME} and its licensors. Our trademarks
          and trade dress may not be used in connection with any product or service
          without our prior written consent.
        </LegalText>
      </LegalSection>

      <LegalSection title="Termination">
        <LegalText>
          We may terminate or suspend your account immediately, without prior notice or
          liability, for any reason, including breach of these terms. Upon termination,
          your right to use the service will immediately cease.
        </LegalText>
      </LegalSection>

      <LegalSection title="Limitation of Liability">
        <LegalText>
          In no event shall {APP_NAME}, nor its directors, employees, partners, agents,
          suppliers, or affiliates, be liable for any indirect, incidental, special,
          consequential, or punitive damages, including loss of profits, data, or other
          intangible losses.
        </LegalText>
      </LegalSection>

      <LegalSection title="Disclaimer">
        <LegalText>
          Your use of the service is at your sole risk. The service is provided on an "AS
          IS" and "AS AVAILABLE" basis without warranties of any kind, either express or
          implied.
        </LegalText>
      </LegalSection>

      <LegalSection title="Governing Law">
        <LegalText>
          These terms shall be governed by and construed in accordance with the laws of
          your jurisdiction, without regard to its conflict of law provisions.
        </LegalText>
      </LegalSection>

      <LegalSection title="Changes to Terms">
        <LegalText>
          We reserve the right to modify or replace these terms at any time. If a revision
          is material, we will provide at least 30 days' notice prior to any new terms
          taking effect.
        </LegalText>
      </LegalSection>

      <LegalSection title="Contact Us">
        <LegalText>
          If you have any questions about these Terms of Service, please contact us at{' '}
          {ADMIN_EMAIL}.
        </LegalText>
      </LegalSection>
    </LegalPage>
  )
}
