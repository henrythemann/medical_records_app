# V-SNAP
This app lets you view your medical imaging (but planning to add more features and make it more of a one-stop shop for your vaccinations, labs, records, imaging, etc)

# imaging decryption
This app's decryption routine comes from reverse-engineering the DCSView program bundled on one of my medical imaging CDs. 5 out of 5 hospitals I got my imaging from bundled DCSView on the CDs they gave me, so it's safe to assume DCSView is pretty industry-standard. If there are other softwares bundled on imaging CDs that encrypt the DICOM files differently, then this program's decryption might not work.

DCSView relies on BouncyCastle to encrypt/decrypt DICOM files, but BouncyCastle is only written for Java and .NET. I initially wanted to do the decryption in native node.js to, but after spending half a day trying to re-create the BouncyCastle decryption routine in node, I gave up and decided to bundle a .NET executable into the Electron app that calls the BouncyCastle functions.