class Cocoapods < Formula
  desc "Dependency manager for Cocoa projects"
  homepage "https://cocoapods.org/"
  url "https://github.com/CocoaPods/CocoaPods/archive/refs/tags/1.14.3.tar.gz"
  sha256 "de05766e5771e0cef7af89f73b0e42a1f1c52a76ce1288592cd9511bcd688a9e"
  license "MIT"
  revision 1

  bottle do
    sha256 cellar: :any,                 arm64_sonoma:   "0fb8e638fb4901b6c578c44ae1af0098a0b3530e7a339bf43f2fb67f2819d412"
    sha256 cellar: :any,                 arm64_ventura:  "e3d0c8624df429cb30c5cf818f3a358d4f678b374410e9fbc8fde090889f9b61"
    sha256 cellar: :any,                 arm64_monterey: "a6df519bae3f51b1609cfcd017b4d47cb688200780ffb9b27d57a5dc05ea93de"
    sha256 cellar: :any,                 sonoma:         "5c2ee41824fcb154b46f9fa967f203fbf9009d2051f8c898375d69d333052988"
    sha256 cellar: :any,                 ventura:        "91459cb108161201a81fdd0e96a126e9843be8213112c208051e8e72ce9736f9"
    sha256 cellar: :any,                 monterey:       "316b0954e21f76c013d8c581c589e4f884231687eb2253a9f9a38a77a87728a6"
    sha256 cellar: :any_skip_relocation, x86_64_linux:   "2d5be1290e8161d9a49b3fd191fc8423aac29f61fbc84148c8ba08cdc03d8d84"
  end

  depends_on "pkg-config" => :build
  depends_on "ruby"
  uses_from_macos "libffi", since: :catalina

  def install
    ENV["GEM_HOME"] = libexec
    system "gem", "build", "cocoapods.gemspec"
    system "gem", "install", "cocoapods-#{version}.gem"
    # Other executables don't work currently.
    bin.install libexec/"bin/pod", libexec/"bin/xcodeproj"
    bin.env_script_all_files(libexec/"bin", GEM_HOME: ENV["GEM_HOME"])
  end

  test do
    system "#{bin}/pod", "list"
  end
end
