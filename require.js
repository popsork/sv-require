var require = function(requirePath) {
   var utils = request.getAttribute('sitevision.utils'),
       session = request.getAttribute('sitevision.jcr.session'),
       propertyUtil = utils.propertyUtil,
       resourceLocatorUtil = utils.resourceLocatorUtil,
       execute,
       getCode,
       findNode,
       joinPath,
       cache = {};
   
   getCode = function(node) {
      var binary = propertyUtil.getBinary(node, 'URI'),
         stream,
         reader,
         builder,
         maximumLinesToRead = 20000,
         line;
      
      if (binary) {
         stream = binary.getStream();
         reader = new BufferedReader(new InputStreamReader(stream));
         builder = new java.lang.StringBuilder();
         line = reader.readLine();

         while (line && --maximumLinesToRead > 0) {
            builder.append(line + "\n");
            line = reader.readLine();
         }
         
         stream.close();
         return builder.toString() + '';
      }
      
      return null;
   }
   
   execute = function(fileNode) {
      var ident = fileNode.identifier + '';
      if (ident in cache) {
         return cache[ident];
      }
      
      var code = getCode(fileNode);
      var func = new Function('require', 'module', 'exports', code),
         mod = { exports: {} };
      
      func.call(mod.exports, function(nextNodePath) {
         var nextNode = findNode(fileNode.path + '', nextNodePath);
         if (nextNode) {
            return execute(nextNode);
         }
      }, mod, mod.exports);
      
      cache[ident] = mod.exports;
      return mod.exports;
   }
   
   joinPath = function(root, path) {
      var fileRepositoryRootPath = resourceLocatorUtil.fileRepository.path + '',
         normalizedRoot = root.replace(fileRepositoryRootPath, ''),
         rootIsFile = normalizedRoot.indexOf('.', normalizedRoot.lastIndexOf('/')) > -1;
      
      if (rootIsFile) {
         normalizedRoot = normalizedRoot.substr(0, normalizedRoot.lastIndexOf('/'));
      }
      
      //
      // path is absolute.
      if (path.substr(0, 1) == '/') {
         return fileRepositoryRootPath + path;
      }
      
      if (path.substr(0, 2) == './') {
         path = path.substr(1);
      }
      
      if (path.substr(0, 1) != '/') {
         path = '/' + path;
      }
      
      if (normalizedRoot.substr(normalizedRoot.length - 1) == '/') {
         normalizedRoot = normalizedRoot.substr(0, normalizedRoot.length - 1);
      }
      
      var resultPath = fileRepositoryRootPath + normalizedRoot + path,
         pathParts = resultPath.split('/'),
         normalizedPath = [];
      
      for (var i = 0; i < pathParts.length; i++) {
         var part = pathParts[i];
         if (part == '..') {
            normalizedPath.pop();
            continue;
         }
         
         normalizedPath.push(part);
      }
      
      return normalizedPath.join('/');
   }
   
   findNode = function(root, path) {
      var fileNode = null;
      if (path.match(/^18\.(.*?)$/)) {
         fileNode = session.getNodeByIdentifier(path);
      } else {
         var joinedPath = joinPath(root, path);
         fileNode = resourceLocatorUtil.getNodeByPath(joinedPath);
      }
      
      return fileNode;
   }
   
   var node = findNode(resourceLocatorUtil.fileRepository.path + '', requirePath);
   if (node) {
      return execute(node);
   }
   
   return null;
};

this['require'] = require;
