#!/usr/bin/env ruby
require 'fileutils'
require 'json'
require 'xcodeproj'

root = File.expand_path('..', __dir__)
ios = File.join(root, 'ios')
project_path = File.join(ios, 'NativeFeatureTests.xcodeproj')
project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |target| target.name == 'NativeFeatureTests' }
abort('generated NativeFeatureTests app target missing') unless app

test_name = 'NativeFeaturePurchasesUITests'
tests = project.targets.find { |target| target.name == test_name } ||
  project.new_target(:ui_test_bundle, test_name, :ios, '17.0')

FileUtils.cp(File.join(__dir__, 'OnePurchasesUITests.swift'), File.join(ios, 'OnePurchasesUITests.swift'))
FileUtils.cp(File.join(root, 'assets', 'one-native-purchases.storekit'), File.join(ios, 'OnePurchases.storekit'))

group = project.main_group.children.find { |child| child.display_name == 'OnePurchasesProof' } ||
  project.main_group.new_group('OnePurchasesProof')
source = group.files.find { |file| file.path == 'OnePurchasesUITests.swift' } ||
  group.new_file('OnePurchasesUITests.swift')
configuration = group.files.find { |file| file.path == 'OnePurchases.storekit' } ||
  group.new_file('OnePurchases.storekit')
tests.source_build_phase.add_file_reference(source) unless tests.source_build_phase.files_references.include?(source)
tests.resources_build_phase.add_file_reference(configuration) unless tests.resources_build_phase.files_references.include?(configuration)
tests.add_dependency(app) unless tests.dependencies.any? { |dependency| dependency.target == app }
tests.build_configurations.each do |config|
  config.build_settings.merge!({
    'SWIFT_VERSION' => '5.0',
    'PRODUCT_NAME' => test_name,
    'PRODUCT_BUNDLE_IDENTIFIER' => 'dev.vxrn.native.tests.purchases.uitests',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'CODE_SIGNING_ALLOWED' => 'NO',
    'TEST_TARGET_NAME' => app.name,
    'TARGETED_DEVICE_FAMILY' => '1',
    'IPHONEOS_DEPLOYMENT_TARGET' => '17.0',
  })
end
project.save

plan = {
  configurations: [{ id: 'A004095B-90D7-4759-87CA-85A43EB98B2C', name: 'StoreKit', options: {} }],
  defaultOptions: {
    storeKitConfiguration: { identifier: 'OnePurchases.storekit' },
    targetForVariableExpansion: {
      containerPath: 'container:NativeFeatureTests.xcodeproj',
      identifier: app.uuid,
      name: app.name,
    },
  },
  testTargets: [{ target: {
    containerPath: 'container:NativeFeatureTests.xcodeproj',
    identifier: tests.uuid,
    name: tests.name,
  } }],
  version: 1,
}
File.write(File.join(ios, 'OnePurchases.xctestplan'), JSON.pretty_generate(plan) + "\n")

scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.add_test_target(tests)
scheme.set_launch_target(app)
scheme.save_as(project_path, 'NativeFeaturePurchases', true)
scheme_path = File.join(project_path, 'xcshareddata', 'xcschemes', 'NativeFeaturePurchases.xcscheme')
xml = File.read(scheme_path)
xml.sub!('      <Testables>', <<~XML.chomp)
      <TestPlans>
         <TestPlanReference reference = "container:OnePurchases.xctestplan" default = "YES"></TestPlanReference>
      </TestPlans>
      <Testables>
XML
xml.sub!('   </LaunchAction>', <<~XML.chomp)
      <StoreKitConfigurationFileReference identifier = "../OnePurchases.storekit"></StoreKitConfigurationFileReference>
   </LaunchAction>
XML
File.write(scheme_path, xml)
