  const getRelativePath = (files, fieldName) => {
            if (files && files[fieldName] && files[fieldName][0]) {
                const fullPath = files[fieldName][0].path; // e.g. 'uploads/images/abc.jpg'
                return fullPath.replace(/\\/g, '/').replace(/^uploads\//, '');
            }
            return '';
        };

module.exports=getRelativePath;