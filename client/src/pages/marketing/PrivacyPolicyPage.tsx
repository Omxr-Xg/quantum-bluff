import { useTranslation } from "react-i18next";
import { getSiteContent } from "../../content/marketing/siteContent";
import { MarketingTextPage } from "./MarketingTextPage";

export function PrivacyPolicyPage() {
  const { i18n, t } = useTranslation();
  const privacy = getSiteContent(i18n.language).privacy;
  return (
    <MarketingTextPage
      title={privacy.title}
      lastUpdated={`${t("publicSite.lastUpdated")} ${privacy.lastUpdated}`}
      sections={privacy.sections}
    />
  );
}
