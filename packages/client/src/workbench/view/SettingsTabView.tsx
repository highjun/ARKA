import { useViewModel } from "#core/viewmodel";
import { Heading } from "@primer/react";
import { Text } from "#component/Text";
import styles from "./SettingsTabView.module.css";

const THEMES = [
  { value: "light", label: "밝게" },
  { value: "dark", label: "어둡게" },
] as const;
const DENSITIES = [
  { value: "auto", label: "자동 (터치 기기면 넓게)" },
  { value: "compact", label: "촘촘하게 (IDE 밀도)" },
  { value: "touch", label: "넓게 (터치 타겟 44px)" },
] as const;

/** 설정 탭. 라디오 두 묶음 — 키가 늘면 섹션이 는다. */
export const SettingsTabView = () => {
  const viewModel = useViewModel("arka.workbench.settingsViewModel");
  return (
    <div data-component="SettingsTabView" className={styles["root"]}>
      <section className={styles["section"]}>
        <Heading as="h2" variant="medium">
          테마
        </Heading>
        <fieldset className={styles["options"]}>
          <legend className={styles["legend"]}>화면 밝기</legend>
          {THEMES.map((theme) => (
            <label key={theme.value} className={styles["option"]}>
              <input
                type="radio"
                name="theme"
                value={theme.value}
                checked={viewModel.theme === theme.value}
                onChange={() => viewModel.setTheme(theme.value)}
              />
              <Text>{theme.label}</Text>
            </label>
          ))}
        </fieldset>
      </section>
      <section className={styles["section"]}>
        <Heading as="h2" variant="medium">
          밀도
        </Heading>
        <fieldset className={styles["options"]}>
          <legend className={styles["legend"]}>행 높이와 터치 타겟</legend>
          {DENSITIES.map((density) => (
            <label key={density.value} className={styles["option"]}>
              <input
                type="radio"
                name="density"
                value={density.value}
                checked={viewModel.density === density.value}
                onChange={() => viewModel.setDensity(density.value)}
              />
              <Text>{density.label}</Text>
            </label>
          ))}
        </fieldset>
      </section>
    </div>
  );
};
