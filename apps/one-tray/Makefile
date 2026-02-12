APP = OneTray.app
BINARY = one-tray
SRC = OneTray.swift

.PHONY: build debug release clean install

# debug build (default)
build: debug

debug: $(SRC) Info.plist
	swiftc -g -o $(BINARY) $(SRC) -framework Cocoa -framework SwiftUI
	mkdir -p $(APP)/Contents/MacOS
	cp $(BINARY) $(APP)/Contents/MacOS/
	cp Info.plist $(APP)/Contents/

# optimized release build
release: $(SRC) Info.plist
	swiftc -O -o $(BINARY) $(SRC) -framework Cocoa -framework SwiftUI
	mkdir -p $(APP)/Contents/MacOS
	cp $(BINARY) $(APP)/Contents/MacOS/
	cp Info.plist $(APP)/Contents/

# install to ~/Applications
install: release
	mkdir -p ~/Applications
	rm -rf ~/Applications/$(APP)
	cp -R $(APP) ~/Applications/

clean:
	rm -rf $(BINARY) $(APP)
