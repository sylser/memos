import { create } from "@bufbuild/protobuf";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateUserGeneralSetting } from "@/hooks/useUserQueries";
import { Visibility } from "@/types/proto/api/v1/memo_service_pb";
import { UserSetting_GeneralSetting, UserSetting_GeneralSettingSchema } from "@/types/proto/api/v1/user_service_pb";
import { loadLocale, useTranslate } from "@/utils/i18n";
import { convertVisibilityFromString, convertVisibilityToString } from "@/utils/memo";
import { loadTheme } from "@/utils/theme";
import LocaleSelect from "../LocaleSelect";
import ThemeSelect from "../ThemeSelect";
import VisibilityIcon from "../VisibilityIcon";
import SettingGroup from "./SettingGroup";
import SettingRow from "./SettingRow";
import SettingSection from "./SettingSection";

const IMAGE_COMPRESSION_QUALITY_STORAGE_KEY = "memos-image-compression-quality";
const DEFAULT_IMAGE_COMPRESSION_QUALITY = 90;

const PreferencesSection = () => {
  const t = useTranslate();
  const { currentUser, userGeneralSetting: generalSetting, refetchSettings } = useAuth();
  const { mutate: updateUserGeneralSetting } = useUpdateUserGeneralSetting(currentUser?.name);

  const handleLocaleSelectChange = (locale: Locale) => {
    // Apply locale immediately for instant UI feedback and persist to localStorage
    loadLocale(locale);
    // Persist to user settings
    updateUserGeneralSetting(
      { generalSetting: { locale }, updateMask: ["locale"] },
      {
        onSuccess: () => {
          refetchSettings();
        },
      },
    );
  };

  const handleDefaultMemoVisibilityChanged = (value: string) => {
    updateUserGeneralSetting(
      { generalSetting: { memoVisibility: value }, updateMask: ["memo_visibility"] },
      {
        onSuccess: () => {
          refetchSettings();
        },
      },
    );
  };

  const handleThemeChange = (theme: string) => {
    // Apply theme immediately for instant UI feedback
    loadTheme(theme);
    // Persist to user settings
    updateUserGeneralSetting(
      { generalSetting: { theme }, updateMask: ["theme"] },
      {
        onSuccess: () => {
          refetchSettings();
        },
      },
    );
  };

  const imageCompressionQuality = (() => {
    const raw = localStorage.getItem(IMAGE_COMPRESSION_QUALITY_STORAGE_KEY);
    const value = raw ? Number(raw) : DEFAULT_IMAGE_COMPRESSION_QUALITY;
    if (!Number.isFinite(value) || value <= 0 || value > 100) {
      return DEFAULT_IMAGE_COMPRESSION_QUALITY;
    }
    return Math.round(value);
  })();

  const handleImageCompressionQualityChanged = (value: string) => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return;
    }
    const clamped = Math.max(1, Math.min(100, Math.round(num)));
    localStorage.setItem(IMAGE_COMPRESSION_QUALITY_STORAGE_KEY, String(clamped));
  };

  // Provide default values if setting is not loaded yet
  const setting: UserSetting_GeneralSetting =
    generalSetting ||
    create(UserSetting_GeneralSettingSchema, {
      locale: "en",
      memoVisibility: "PRIVATE",
      theme: "system",
    });

  return (
    <SettingSection title={t("setting.preference.label")}>
      <SettingGroup title={t("common.basic")}>
        <SettingRow label={t("common.language")}>
          <LocaleSelect value={setting.locale} onChange={handleLocaleSelectChange} />
        </SettingRow>

        <SettingRow label={t("setting.preference.theme")}>
          <ThemeSelect value={setting.theme} onValueChange={handleThemeChange} />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("common.memo")} showSeparator>
        <SettingRow label={t("setting.preference.default-memo-visibility")}>
          <Select value={setting.memoVisibility || "PRIVATE"} onValueChange={handleDefaultMemoVisibilityChanged}>
            <SelectTrigger className="min-w-fit">
              <div className="flex items-center gap-2">
                <VisibilityIcon visibility={convertVisibilityFromString(setting.memoVisibility)} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {[Visibility.PRIVATE, Visibility.PROTECTED, Visibility.PUBLIC]
                .map((v) => convertVisibilityToString(v))
                .map((item) => (
                  <SelectItem key={item} value={item} className="whitespace-nowrap">
                    {t(`memo.visibility.${item.toLowerCase() as Lowercase<typeof item>}`)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow
          label={t("setting.preference.image-compression-quality")}
          tooltip={t("setting.preference.image-compression-quality-hint")}
        >
          <Input
            className="w-24 font-mono"
            type="number"
            min={1}
            max={100}
            defaultValue={String(imageCompressionQuality)}
            onBlur={(event) => handleImageCompressionQualityChanged(event.target.value)}
          />
        </SettingRow>
      </SettingGroup>
    </SettingSection>
  );
};

export default PreferencesSection;
