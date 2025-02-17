using System;
using System.Reflection;
using System.IO;
// using DatCard.Encryption;
using Org.BouncyCastle.Asn1;
using Org.BouncyCastle.Cms;
using Org.BouncyCastle.Crypto;
using Org.BouncyCastle.Security;

class Program
{
	static void Main(string[] args)
	{
		if (args.Length != 2)
		{
			Console.WriteLine("Usage: DotnetDecryptDll <input file> <password>");
		}
		AESEncrypt.Decrypt(args[0], args[0] + "_decrypt", args[1]);
	}
}

internal class AESEncrypt
{
	private static string m_EncryptionOID = "2.16.840.1.101.3.4.1.42";

	private static int m_EncryptionInterations = 1000;

	public static string EncryptionOID
	{
		get
		{
			return m_EncryptionOID;
		}
		set
		{
			m_EncryptionOID = value;
		}
	}

	public static int EncryptionInterations
	{
		get
		{
			return m_EncryptionInterations;
		}
		set
		{
			m_EncryptionInterations = value;
		}
	}

	public static bool IsEncrypted(string Filename)
	{
		byte[] array = new byte[13]
		{
			48, 128, 6, 9, 42, 134, 72, 134, 247, 13,
			1, 7, 3
		};
		byte[] array2 = new byte[array.Length];
		using (FileStream fileStream = File.OpenRead(Filename))
		{
			fileStream.Read(array2, 0, array.Length);
		}
		for (int i = 0; i < array.Length; i++)
		{
			if (array2[i] != array[i])
			{
				return false;
			}
		}
		return true;
	}

	private static void CopyStreamContents(Stream objInput, Stream objOutput)
	{
		if (objInput == null)
		{
			throw new ArgumentNullException("input");
		}
		if (objOutput == null)
		{
			throw new ArgumentNullException("output");
		}
		if (!objInput.CanRead)
		{
			throw new ArgumentException("Input stream must support CanRead");
		}
		if (!objOutput.CanWrite)
		{
			throw new ArgumentException("Output stream must support CanWrite");
		}
		if (objInput.CanSeek && objInput.Length == 0)
		{
			return;
		}
		int num = 1024;
		byte[] buffer = new byte[num];
		do
		{
			num = objInput.Read(buffer, 0, num);
			if (num > 0)
			{
				objOutput.Write(buffer, 0, num);
			}
		}
		while (num > 0);
	}

	public static void Encrypt(string InputFile, string EncryptedFile, string Password)
	{
		using (Stream objInput = File.OpenRead(InputFile))
		{
			using (Stream outputStream = File.OpenWrite(EncryptedFile))
			{
				Stream stream = CmsEncryption.Encrypt(outputStream, Password);
				CopyStreamContents(objInput, stream);
				stream.Close();
			}
		}
	}

	public static Stream Encrypt(Stream EncryptedStream, string Password)
	{
		return CmsEncryption.Encrypt(EncryptedStream, Password);
	}

	public static void Decrypt(string EncryptedFile, string OutputFile, string Password)
	{
		Console.WriteLine("Decrypt1");
		using (Stream encryptedStream = File.OpenRead(EncryptedFile))
		{
			using (Stream objOutput = File.OpenWrite(OutputFile))
			{
				Stream stream = Decrypt(encryptedStream, Password);
				CopyStreamContents(stream, objOutput);
				stream.Close();
			}
		}
	}

	public static Stream Decrypt(Stream EncryptedStream, string Password)
	{
		Console.WriteLine("Decrypt2");
		return CmsEncryption.Decrypt(EncryptedStream, Password);
	}

	public static bool Copy2Encrypted(string input, string output, string Password)
	{
		bool flag = false;
		try
		{
			Encrypt(input, output, Password);
			return true;
		}
		catch (Exception ex)
		{
			throw ex;
		}
	}

	public static bool EncryptInPlace(string input, string output, string Password)
	{
		bool flag = false;
		try
		{
			Encrypt(input, output, Password);
			if (File.Exists(output))
			{
				File.Delete(input);
				File.Move(output, input);
				return true;
			}
			return false;
		}
		catch (Exception ex)
		{
			throw ex;
		}
	}

	public static bool CopyFromEncrypted(string input, string output, string Password)
	{
		bool flag = false;
		try
		{
			if (IsEncrypted(input))
			{
				Decrypt(input, output, Password);
			}
			return true;
		}
		catch (Exception ex)
		{
			throw ex;
		}
	}
}

internal class CmsEncryption
{
	public static Stream Decrypt(Stream Stream, string Password)
	{
		try
		{
			return InternalDecrypt(Stream, Password);
		}
		catch (FileNotFoundException ex)
		{
			throw new Exception(ex.Message);
		}
	}
	public static void PrintPkcs5Key(Pkcs5Scheme2Utf8PbeKey key)
	{
		// Print public properties
		foreach (PropertyInfo prop in key.GetType().GetProperties())
		{
			Console.WriteLine($"{prop.Name}: {prop.GetValue(key)}");
		}

		// Print private fields
		foreach (FieldInfo field in key.GetType().GetFields(BindingFlags.Instance | BindingFlags.NonPublic))
		{
			object value = field.GetValue(key);
			// If the field is a byte array, print it in hex.
			if (value is byte[] bytes)
			{
				Console.WriteLine($"{field.Name}: {BitConverter.ToString(bytes)}");
			}
			else
			{
				Console.WriteLine($"{field.Name}: {value}");
			}
		}
	}
	private static Stream InternalDecrypt(Stream Stream, string Password)
	{
		try
		{
			CmsEnvelopedDataParser cmsEnvelopedDataParser = new CmsEnvelopedDataParser(Stream);
			RecipientID selector = new RecipientID();
			RecipientInformation firstRecipient = cmsEnvelopedDataParser.GetRecipientInfos().GetFirstRecipient(selector);
			Console.WriteLine("firstRecipient: " + firstRecipient);
			PasswordRecipientInformation passwordRecipientInformation = (PasswordRecipientInformation)firstRecipient;
			DerSequence derSequence = (DerSequence)passwordRecipientInformation.KeyDerivationAlgorithm.Parameters;
			byte[] salt = ((DerOctetString)derSequence[0]).GetOctets();
			Console.WriteLine("Salt (hex): " + BitConverter.ToString(salt));
			int iterations = ((DerInteger)derSequence[1]).Value.IntValue;
			Console.WriteLine("iterations: " + iterations);
			Pkcs5Scheme2Utf8PbeKey key = new Pkcs5Scheme2Utf8PbeKey(Password.ToCharArray(), salt, iterations);
			PrintPkcs5Key(key);
			return firstRecipient.GetContentStream(key).ContentStream;
		}
		catch (InvalidCipherTextException ex)
		{
			throw new Exception(ex.Message);
		}
		catch (Exception ex2)
		{
			throw new Exception(ex2.Message);
		}
	}

	public static Stream Encrypt(Stream OutputStream, string Password)
	{
		try
		{
			return InternalEncrypt(OutputStream, Password);
		}
		catch (FileNotFoundException ex)
		{
			throw new Exception(ex.Message);
		}
	}

	private static Stream InternalEncrypt(Stream OutputStream, string Password)
	{
		SecureRandom secureRandom = new SecureRandom();
		byte[] array = new byte[16];
		secureRandom.NextBytes(array);
		CmsEnvelopedDataStreamGenerator cmsEnvelopedDataStreamGenerator = new CmsEnvelopedDataStreamGenerator(secureRandom);
		CmsPbeKey pbeKey = new Pkcs5Scheme2Utf8PbeKey(Password.ToCharArray(), array, AESEncrypt.EncryptionInterations);
		cmsEnvelopedDataStreamGenerator.AddPasswordRecipient(pbeKey, AESEncrypt.EncryptionOID);
		return cmsEnvelopedDataStreamGenerator.Open(OutputStream, AESEncrypt.EncryptionOID);
	}
}
