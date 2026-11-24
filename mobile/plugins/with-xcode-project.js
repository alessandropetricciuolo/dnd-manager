const { IOSConfig, withXcodeProject } = require('expo/config-plugins');

module.exports = function withXcodeProjectSetup(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const { mainGroup } = project.getFirstProject().firstProject;

    // CocoaPods resource scripts write a temporary file in Pods during the app build.
    const { target } = project.getTarget('com.apple.product-type.application');
    const appConfigurations = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
      project,
      target.buildConfigurationList,
    );
    for (const [, { buildSettings }] of appConfigurations) {
      buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
    }

    // Reference the existing Expo sources from ios/ without adding them to a native target.
    const sourceReferences = [
      ['../App.tsx', 'text'],
      ['../src', 'folder'],
    ];
    for (const [path, lastKnownFileType] of sourceReferences) {
      const file = project.addFile(path, mainGroup, { lastKnownFileType });
      if (!file) continue;

      const reference = project.pbxFileReferenceSection()[file.fileRef];
      delete reference.explicitFileType;
      if (reference.fileEncoding === undefined) delete reference.fileEncoding;
    }

    // Expo's bundle phase must keep the resolved script path together when it contains spaces.
    const phases = Object.values(project.getPBXObject('PBXShellScriptBuildPhase'));
    const bundlePhase = phases.find((phase) => phase.name === '"Bundle React Native code and images"');
    if (bundlePhase) {
      bundlePhase.shellScript = bundlePhase.shellScript.replace(
        /`([^`]*react-native-xcode\.sh[^`]*)`/,
        (_, command) => '\\"$(' + command + ')\\"',
      );
    }

    return config;
  });
};
