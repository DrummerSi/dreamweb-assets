using System.Diagnostics;

public class FileHeader
{
	public string _desc = new string(new char[50]);
	public ushort[] _len = new ushort[20];
	public byte[] _padding = new byte[6];

//C++ TO C# CONVERTER WARNING: 'const' methods are not available in C#:
//ORIGINAL LINE: ushort len(uint i) const
	public ushort len(uint i)
	{
		Debug.Assert(i < 20);
		return READ_LE_UINT16(_len[i]);
	}
	public void setLen(uint i, ushort length)
	{
		Debug.Assert(i < 20);
		WRITE_LE_UINT16(_len[i], length);
	}
}

public static class GlobalMembers
{
	public static FileHeader PACKED_STRUCT = new FileHeader();
}
