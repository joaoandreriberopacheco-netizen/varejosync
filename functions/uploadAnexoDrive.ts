import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    const referencia_tipo = formData.get('referencia_tipo');
    const referencia_id = formData.get('referencia_id');
    const referencia_numero = formData.get('referencia_numero') || '';
    const descricao = formData.get('descricao') || '';

    if (!file || !referencia_tipo || !referencia_id) {
      return Response.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    // 1. Criar pasta "Comprovantes App" se não existir (busca pelo nome na raiz)
    const folderName = 'Comprovantes - VarejoSync';
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const searchData = await searchRes.json();

    let folderId;
    if (searchData.files && searchData.files.length > 0) {
      folderId = searchData.files[0].id;
    } else {
      // Criar pasta
      const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      const folder = await createFolderRes.json();
      folderId = folder.id;
    }

    // 2. Upload do arquivo para a pasta
    const fileBuffer = await file.arrayBuffer();
    const fileName = file.name || `anexo_${Date.now()}`;
    const mimeType = file.type || 'application/octet-stream';

    const metadata = {
      name: `${referencia_tipo}_${referencia_numero || referencia_id}_${fileName}`,
      parents: [folderId],
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}`;
    const filePart = `Content-Type: ${mimeType}\r\n\r\n`;

    const enc = new TextEncoder();
    const metadataBytes = enc.encode(delimiter + metadataPart + delimiter + filePart);
    const closeBytes = enc.encode(closeDelimiter);

    const combined = new Uint8Array(metadataBytes.length + fileBuffer.byteLength + closeBytes.length);
    combined.set(metadataBytes, 0);
    combined.set(new Uint8Array(fileBuffer), metadataBytes.length);
    combined.set(closeBytes, metadataBytes.length + fileBuffer.byteLength);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,thumbnailLink,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: combined,
      }
    );

    const uploadData = await uploadRes.json();
    if (!uploadData.id) {
      return Response.json({ error: 'Falha no upload para o Drive', details: uploadData }, { status: 500 });
    }

    // 3. Tornar o arquivo acessível via link (anyone with link can view)
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });

    // 4. Salvar AnexoDocumento na base
    const anexo = await base44.asServiceRole.entities.AnexoDocumento.create({
      referencia_tipo,
      referencia_id,
      referencia_numero,
      nome_arquivo: fileName,
      url_drive: uploadData.webViewLink || `https://drive.google.com/file/d/${uploadData.id}/view`,
      drive_file_id: uploadData.id,
      url_thumbnail: uploadData.thumbnailLink || null,
      mime_type: mimeType,
      tamanho_bytes: file.size || 0,
      origem: 'upload_manual',
      descricao,
    });

    return Response.json({ success: true, anexo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});