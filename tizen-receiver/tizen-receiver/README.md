# Jcrw Tizen Receiver (prototype)

Samsung Smart TV receiver using the Tizen Web App profile and TVWindow PiP.

Samsung does not support system-wide overlay applications. This receiver instead embeds the current TV/HDMI source in its `MAIN` TVWindow behind a transparent app UI, then draws captions inside the app. Samsung documents PiP overlays on TVs from 2016 onward.

The companion link is local WebSocket on port `43822`. On the tablet, open **Settings → Samsung Tizen TV receiver pairing**, enter the tablet IP and six-digit code on the TV, then start translation. The Tizen app stores its pairing token in local storage.

## Build and install

Open this directory in Samsung Tizen Studio as a TV Web Application, sign it with a Samsung TV certificate profile, build a `.wgt`, then install it to a developer-mode TV over the network. Android APK files cannot run on Tizen.

This prototype requires final testing on a real Samsung TV. The connected Sony Android TV is not a Tizen test target. Current host environment does not include Tizen Studio, so a signed `.wgt` is not produced here.
