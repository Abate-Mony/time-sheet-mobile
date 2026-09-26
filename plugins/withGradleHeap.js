const { withGradleProperties } = require("@expo/config-plugins");

// The GitHub Actions workflow builds via raw `gradlew assembleRelease`
// (not `eas build`), and android/ is gitignored — regenerated fresh by
// `expo prebuild` on every run, so a manually-edited gradle.properties never
// persists. The default JVM heap it generates (~2GB) isn't enough for this
// project's release compile + D8 dex-merge step, which was failing in CI
// with "OutOfMemoryError: Java heap space". This config plugin bumps it on
// every prebuild instead.
const withGradleHeap = (config) =>
  withGradleProperties(config, (config) => {
    const props = config.modResults;
    const jvmArgsIndex = props.findIndex(
      (item) => item.type === "property" && item.key === "org.gradle.jvmargs"
    );
    const jvmArgs = "-Xmx4096m -XX:MaxMetaspaceSize=1024m";

    if (jvmArgsIndex === -1) {
      props.push({ type: "property", key: "org.gradle.jvmargs", value: jvmArgs });
    } else {
      props[jvmArgsIndex] = { type: "property", key: "org.gradle.jvmargs", value: jvmArgs };
    }

    return config;
  });

module.exports = withGradleHeap;
