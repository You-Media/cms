'use client'

// Legacy imports removed: this page now delegates to BannerFormPage

import BannerFormPage from '../BannerFormPage'

export default function NewBannerPage() {
  return <BannerFormPage mode="create" />
}

// Deprecated: inline impl retained temporarily. Use BannerFormPage instead.
function BannerPageImpl({ mode = 'create', bannerId }: { mode?: 'create' | 'edit'; bannerId?: number }) {
  // Delegate to extracted form page to keep only default page export used
  return <BannerFormPage mode={mode} bannerId={bannerId} />
}
 