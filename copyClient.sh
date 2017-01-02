cd ~/clientApp/personalSite-React
git pull origin master
cd ~/node/personalSite-Ember-Server
rm  -r dist
cp -r ~/clientApp/personalSite-React/build ~/node/personalSite-Ember-Server
cp -r build dist
rm -r build
